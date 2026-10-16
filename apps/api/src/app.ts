import express from "express";
import cors from "cors";
import { authRouter } from "./routes/auth";
import { authenticate, requireRole } from "./middleware/auth";
import { projectsRouter } from "./routes/projects";
import { sdkRouter } from "./routes/sdk";

export const app = express();
app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "flagship-api" });
});

app.use("/auth", authRouter);
app.use("/projects", projectsRouter);
app.use("/v1", sdkRouter);

// Demo route to prove RBAC works (admins only).
app.get("/admin/ping", authenticate, requireRole("ADMIN"), (_req, res) => {
  res.json({ message: "pong, admin" });
});