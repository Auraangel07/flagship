import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { authRouter } from "./routes/auth";
import { projectsRouter } from "./routes/projects";
import { sdkRouter } from "./routes/sdk";
import { authenticate, requireRole } from "./middleware/auth";
import { prisma } from "./lib/prisma";
import { env } from "./env";
import pinoHttp from "pino-http";
import { randomUUID } from "node:crypto";
import { logger } from "./lib/logger";

export const app = express();
app.use(
  pinoHttp({
    logger,
    genReqId: (req, res) => {
      const id = (req.headers["x-request-id"] as string) || randomUUID();
      res.setHeader("x-request-id", id);
      return id;
    },
    serializers: {
      req: (req) => ({ id: req.id, method: req.method, url: req.url }),
      res: (res) => ({ statusCode: res.statusCode }),
    },
    customSuccessMessage: (req, res) => `${req.method} ${req.originalUrl} ${res.statusCode}`,
    autoLogging: { ignore: (req) => req.url === "/health" || req.url === "/ready" },
  })
);
const isTest = process.env.NODE_ENV === "test";

app.use(helmet());
app.use(cors({ origin: env.CORS_ORIGIN ? env.CORS_ORIGIN.split(",") : true }));
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
app.get("/", (_req, res) => {
  res.json({
    name: "Flagship API",
    status: "ok",
    endpoints: ["/health", "/ready", "/auth", "/projects", "/v1"],
  });
});

// Liveness: the process is up. Cheap, no dependencies.
app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "flagship-api" });
});

// Readiness: the process can serve traffic (database reachable).
app.get("/ready", async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: "ready", database: "up" });
  } catch {
    res.status(503).json({ status: "unavailable", database: "down" });
  }
});

app.use("/auth", authLimiter, authRouter);
app.use("/projects", projectsRouter);
app.use("/v1", sdkLimiter, sdkRouter);

// Demo route to prove RBAC works (admins only).
app.get("/admin/ping", authenticate, requireRole("ADMIN"), (_req, res) => {
  res.json({ message: "pong, admin" });
});