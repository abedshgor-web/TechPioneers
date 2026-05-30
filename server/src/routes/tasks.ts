import { Router, Request, Response } from "express";

const router = Router();

interface Task {
  id: string;
  title: string;
  description: string;
  priority: "high" | "medium" | "low";
  status: "todo" | "in-progress" | "done";
  createdAt: string;
}

// In-memory storage
const tasks: Task[] = [
  {
    id: "1",
    title: "Design system architecture",
    description: "Plan the overall system design and component structure",
    priority: "high",
    status: "done",
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
  },
  {
    id: "2",
    title: "Implement authentication",
    description: "Add user login and registration with JWT tokens",
    priority: "high",
    status: "in-progress",
    createdAt: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: "3",
    title: "Write unit tests",
    description: "Cover critical business logic with unit tests",
    priority: "medium",
    status: "todo",
    createdAt: new Date().toISOString(),
  },
  {
    id: "4",
    title: "Update documentation",
    description: "Keep README and API docs up to date",
    priority: "low",
    status: "todo",
    createdAt: new Date().toISOString(),
  },
];

let nextId = 5;

// GET /api/tasks
router.get("/", (_req: Request, res: Response) => {
  res.json(tasks);
});

// POST /api/tasks
router.post("/", (req: Request, res: Response) => {
  const { title, description, priority } = req.body;

  if (!title || typeof title !== "string") {
    return res.status(400).json({ error: "Title is required" });
  }

  const task: Task = {
    id: String(nextId++),
    title: title.trim(),
    description: description?.trim() || "",
    priority: (["high", "medium", "low"].includes(priority) ? priority : "medium") as Task["priority"],
    status: "todo",
    createdAt: new Date().toISOString(),
  };

  tasks.push(task);
  return res.status(201).json(task);
});

// PUT /api/tasks/:id
router.put("/:id", (req: Request, res: Response) => {
  const { id } = req.params;
  const index = tasks.findIndex((t) => t.id === id);

  if (index === -1) {
    return res.status(404).json({ error: "Task not found" });
  }

  const { title, description, priority, status } = req.body;
  const task = tasks[index];

  if (title !== undefined) task.title = title.trim();
  if (description !== undefined) task.description = description.trim();
  if (priority && ["high", "medium", "low"].includes(priority)) {
    task.priority = priority;
  }
  if (status && ["todo", "in-progress", "done"].includes(status)) {
    task.status = status;
  }

  tasks[index] = task;
  return res.json(task);
});

// DELETE /api/tasks/:id
router.delete("/:id", (req: Request, res: Response) => {
  const { id } = req.params;
  const index = tasks.findIndex((t) => t.id === id);

  if (index === -1) {
    return res.status(404).json({ error: "Task not found" });
  }

  tasks.splice(index, 1);
  return res.status(204).send();
});

export default router;
