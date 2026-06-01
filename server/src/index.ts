import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import tasksRouter from "./routes/tasks";
import aiRouter from "./routes/ai";
import authRouter from "./routes/auth";
import subscriptionsRouter from "./routes/subscriptions";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());

// Raw body for Stripe webhook MUST come before express.json()
app.use(
  "/api/subscriptions/webhook",
  express.raw({ type: "application/json" })
);

app.use(express.json());

app.use("/api/auth", authRouter);
app.use("/api/subscriptions", subscriptionsRouter);
app.use("/api/tasks", tasksRouter);
app.use("/api/ai", aiRouter);

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", message: "TaskFlow AI server is running" });
});

const clientDist = path.join(__dirname, "../../client/dist");
app.use(express.static(clientDist));
app.get("*", (_req, res) => {
  res.sendFile(path.join(clientDist, "index.html"));
});

app.listen(PORT, () => {
  console.log(`TaskFlow AI server running on http://localhost:${PORT}`);
});
