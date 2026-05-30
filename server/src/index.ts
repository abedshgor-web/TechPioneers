import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import tasksRouter from "./routes/tasks";
import aiRouter from "./routes/ai";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.use("/api/tasks", tasksRouter);
app.use("/api/ai", aiRouter);

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", message: "TaskFlow AI server is running" });
});

app.listen(PORT, () => {
  console.log(`TaskFlow AI server running on http://localhost:${PORT}`);
});
