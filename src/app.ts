import cors from "cors";
import express from "express";
import routes from "./routes/index.js";

const app = express();

app.use(cors());
app.use(express.json({ limit: "10mb" }));

app.get("/api/health", (_req, res) => {
  res.status(200).json({
    status: "ok",
    sistema: "ICMS Ecologico Nova Iguacu",
  });
});

app.use(routes);

export default app;
