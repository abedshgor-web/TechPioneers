import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import authRouter from "./routes/auth";
import tradersRouter from "./routes/traders";
import copyRouter from "./routes/copy";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.use("/api/auth", authRouter);
app.use("/api/traders", tradersRouter);
app.use("/api/copy", copyRouter);

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", message: "CopyTrade Pro server is running" });
});

const clientDist = path.join(__dirname, "../../client/dist");
app.use(express.static(clientDist));
app.get("*", (_req, res) => {
  res.sendFile(path.join(clientDist, "index.html"));
});

app.listen(PORT, () => {
  console.log(`CopyTrade Pro server running on http://localhost:${PORT}`);
});
