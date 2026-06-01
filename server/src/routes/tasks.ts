import { Router, Response } from "express";
import db from "../db";
import { requireAuth, AuthRequest } from "../middleware/auth";

const router = Router();

// All task routes require authentication
router.use(requireAuth);

interface TaskRow {
  id: string;
  user_id: string;
  title: string;
  description: string;
  priority: "high" | "medium" | "low";
  status: "todo" | "in-progress" | "done";
  created_at: string;
}

function rowToTask(row: TaskRow) {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    priority: row.priority,
    status: row.status,
    createdAt: row.created_at,
  };
}

// GET /api/tasks
router.get("/", (req: AuthRequest, res: Response): void => {
  if (!req.user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const rows = db.prepare("SELECT * FROM tasks WHERE user_id = ? ORDER BY created_at DESC").all(req.user.id) as TaskRow[];
  res.json(rows.map(rowToTask));
});

// POST /api/tasks
router.post("/", (req: AuthRequest, res: Response): void => {
  if (!req.user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  // Enforce free plan limit
  if (req.user.plan === "free") {
    const count = (db.prepare("SELECT COUNT(*) as count FROM tasks WHERE user_id = ?").get(req.user.id) as { count: number }).count;
    if (count >= 5) {
      res.status(403).json({
        error: "limit",
        message: "Free plan is limited to 5 tasks. Upgrade to Pro for unlimited tasks.",
      });
      return;
    }
  }

  const { title, description, priority } = req.body;

  if (!title || typeof title !== "string") {
    res.status(400).json({ error: "Title is required" });
    return;
  }

  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();
  const validPriority = (["high", "medium", "low"].includes(priority) ? priority : "medium") as TaskRow["priority"];

  db.prepare(
    "INSERT INTO tasks (id, user_id, title, description, priority, status, created_at) VALUES (?, ?, ?, ?, ?, 'todo', ?)"
  ).run(id, req.user.id, title.trim(), (description as string)?.trim() || "", validPriority, createdAt);

  const row = db.prepare("SELECT * FROM tasks WHERE id = ?").get(id) as TaskRow;
  res.status(201).json(rowToTask(row));
});

// PUT /api/tasks/:id
router.put("/:id", (req: AuthRequest, res: Response): void => {
  if (!req.user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const { id } = req.params;
  const row = db.prepare("SELECT * FROM tasks WHERE id = ?").get(id) as TaskRow | undefined;

  if (!row) {
    res.status(404).json({ error: "Task not found" });
    return;
  }

  if (row.user_id !== req.user.id) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const { title, description, priority, status } = req.body;

  const newTitle = title !== undefined ? (title as string).trim() : row.title;
  const newDescription = description !== undefined ? (description as string).trim() : row.description;
  const newPriority = (priority && ["high", "medium", "low"].includes(priority as string))
    ? (priority as TaskRow["priority"])
    : row.priority;
  const newStatus = (status && ["todo", "in-progress", "done"].includes(status as string))
    ? (status as TaskRow["status"])
    : row.status;

  db.prepare(
    "UPDATE tasks SET title = ?, description = ?, priority = ?, status = ? WHERE id = ?"
  ).run(newTitle, newDescription, newPriority, newStatus, id);

  const updated = db.prepare("SELECT * FROM tasks WHERE id = ?").get(id) as TaskRow;
  res.json(rowToTask(updated));
});

// DELETE /api/tasks/:id
router.delete("/:id", (req: AuthRequest, res: Response): void => {
  if (!req.user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const { id } = req.params;
  const row = db.prepare("SELECT * FROM tasks WHERE id = ?").get(id) as TaskRow | undefined;

  if (!row) {
    res.status(404).json({ error: "Task not found" });
    return;
  }

  if (row.user_id !== req.user.id) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  db.prepare("DELETE FROM tasks WHERE id = ?").run(id);
  res.status(204).send();
});

export default router;
