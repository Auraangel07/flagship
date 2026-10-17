import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { authRouter } from "./routes/auth";
import { projectsRouter } from "./routes/projects";
import { sdkRouter } from "./routes/sdk";
import { authenticate, requireRole } from "./middleware/auth";

export const app = express();

const isTest = process.env.NODE_ENV === "test";

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: "100kb" }));

// Strict limit on login/register to slow down password guessing
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => isTest,
});

// Generous limit for SDK traffic
const sdkLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 1200,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => isTest,
});

app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "flagship-api" });
});

app.use("/auth", authLimiter, authRouter);
app.use("/projects", projectsRouter);
app.use("/v1", sdkLimiter, sdkRouter);

// Demo route to prove RBAC works (admins only).
app.get("/admin/ping", authenticate, requireRole("ADMIN"), (_req, res) => {
  res.json({ message: "pong, admin" });
});