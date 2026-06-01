import { Router, Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import db from "../db";
import { requireAuth, AuthRequest } from "../middleware/auth";

const router = Router();

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me";

interface UserRow {
  id: string;
  email: string;
  password_hash: string;
  name: string;
  stripe_customer_id: string | null;
  plan: string;
  created_at: string;
}

function generateToken(user: { id: string; email: string; plan: string }): string {
  return jwt.sign(
    { id: user.id, email: user.email, plan: user.plan },
    JWT_SECRET,
    { expiresIn: "7d" }
  );
}

// POST /api/auth/register
router.post("/register", async (req: Request, res: Response): Promise<void> => {
  const { email, name, password } = req.body;

  if (!email || typeof email !== "string") {
    res.status(400).json({ error: "Email is required" });
    return;
  }
  if (!name || typeof name !== "string") {
    res.status(400).json({ error: "Name is required" });
    return;
  }
  if (!password || typeof password !== "string" || password.length < 6) {
    res.status(400).json({ error: "Password must be at least 6 characters" });
    return;
  }

  try {
    const existingUser = db.prepare("SELECT id FROM users WHERE email = ?").get(email.toLowerCase().trim()) as UserRow | undefined;
    if (existingUser) {
      res.status(409).json({ error: "Email already registered" });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const id = crypto.randomUUID();
    const createdAt = new Date().toISOString();

    db.prepare(
      "INSERT INTO users (id, email, password_hash, name, plan, created_at) VALUES (?, ?, ?, ?, 'free', ?)"
    ).run(id, email.toLowerCase().trim(), passwordHash, name.trim(), createdAt);

    const user = { id, email: email.toLowerCase().trim(), name: name.trim(), plan: "free" as const };
    const token = generateToken(user);

    res.status(201).json({ token, user });
  } catch (error) {
    console.error("Register error:", error);
    res.status(500).json({ error: "Registration failed" });
  }
});

// POST /api/auth/login
router.post("/login", async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body;

  if (!email || typeof email !== "string") {
    res.status(400).json({ error: "Email is required" });
    return;
  }
  if (!password || typeof password !== "string") {
    res.status(400).json({ error: "Password is required" });
    return;
  }

  try {
    const userRow = db.prepare("SELECT * FROM users WHERE email = ?").get(email.toLowerCase().trim()) as UserRow | undefined;

    if (!userRow) {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }

    const passwordValid = await bcrypt.compare(password, userRow.password_hash);
    if (!passwordValid) {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }

    const user = {
      id: userRow.id,
      email: userRow.email,
      name: userRow.name,
      plan: userRow.plan as "free" | "pro",
    };
    const token = generateToken(user);

    res.json({ token, user });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Login failed" });
  }
});

// GET /api/auth/me
router.get("/me", requireAuth, (req: AuthRequest, res: Response): void => {
  if (!req.user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const userRow = db.prepare("SELECT id, email, name, plan FROM users WHERE id = ?").get(req.user.id) as Omit<UserRow, "password_hash" | "stripe_customer_id" | "created_at"> | undefined;

  if (!userRow) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  res.json({
    id: userRow.id,
    email: userRow.email,
    name: userRow.name,
    plan: userRow.plan,
  });
});

export default router;
