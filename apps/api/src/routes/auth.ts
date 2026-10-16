import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { config } from "../config";
import { authenticate, AuthedRequest } from "../middleware/auth";

export const authRouter = Router();

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  orgName: z.string().min(2),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

function signToken(user: { id: string; orgId: string; role: string }) {
  return jwt.sign(
    { sub: user.id, orgId: user.orgId, role: user.role },
    config.jwtSecret,
    { expiresIn: "7d" }
  );
}

// Creates a new organization and its first user (ADMIN).
authRouter.post("/register", async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  const { email, password, orgName } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return res.status(409).json({ error: "Email already registered" });

  const passwordHash = await bcrypt.hash(password, 10);
  const org = await prisma.organization.create({ data: { name: orgName } });
  const user = await prisma.user.create({
    data: { email, passwordHash, role: "ADMIN", orgId: org.id },
  });

  res.status(201).json({
    token: signToken(user),
    user: { id: user.id, email: user.email, role: user.role, orgId: user.orgId },
  });
});

authRouter.post("/login", async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  const { email, password } = parsed.data;

  const user = await prisma.user.findUnique({ where: { email } });
  const ok = user && (await bcrypt.compare(password, user.passwordHash));
  if (!user || !ok) return res.status(401).json({ error: "Invalid credentials" });

  res.json({
    token: signToken(user),
    user: { id: user.id, email: user.email, role: user.role, orgId: user.orgId },
  });
});

authRouter.get("/me", authenticate, (req: AuthedRequest, res) => {
  res.json({ user: req.user });
});