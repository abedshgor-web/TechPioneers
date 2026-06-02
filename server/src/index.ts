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
  const indexPath = path.join(clientDist, "index.html");
  res.sendFile(indexPath, (err) => {
    if (err) {
      res.status(200).send(`<!DOCTYPE html><html><head><title>CopyTrade Pro</title></head><body style="background:#080c14;color:#94a3b8;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;flex-direction:column;gap:12px"><div style="font-size:32px;font-weight:900;color:#fff">CopyTrade Pro</div><div>Server is running. Static files not found at: ${indexPath}</div></body></html>`);
    }
  });
});

app.listen(PORT, () => {
  console.log(`CopyTrade Pro server running on port ${PORT}`);
  console.log(`Static files path: ${clientDist}`);
  const fs = require("fs");
  console.log(`Client dist exists: ${fs.existsSync(clientDist)}`);
});
