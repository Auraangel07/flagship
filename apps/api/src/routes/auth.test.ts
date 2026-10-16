import { describe, it, expect, afterAll } from "vitest";
import request from "supertest";
import bcrypt from "bcryptjs";
import { app } from "../app";
import { prisma } from "../lib/prisma";

const stamp = Date.now();
const adminEmail = `admin-${stamp}@test.dev`;
const viewerEmail = `viewer-${stamp}@test.dev`;
const password = "supersecret1";

afterAll(async () => {
  await prisma.$disconnect();
});

describe("auth and RBAC", () => {
  let adminToken = "";
  let orgId = "";

  it("registers a new org with an ADMIN user", async () => {
    const res = await request(app)
      .post("/auth/register")
      .send({ email: adminEmail, password, orgName: "Test Org" });
    expect(res.status).toBe(201);
    expect(res.body.user.role).toBe("ADMIN");
    adminToken = res.body.token;
    orgId = res.body.user.orgId;
  });

  it("rejects duplicate emails", async () => {
    const res = await request(app)
      .post("/auth/register")
      .send({ email: adminEmail, password, orgName: "Dup Org" });
    expect(res.status).toBe(409);
  });

  it("rejects a wrong password", async () => {
    const res = await request(app)
      .post("/auth/login")
      .send({ email: adminEmail, password: "wrongpassword" });
    expect(res.status).toBe(401);
  });

  it("returns the current user with a valid token", async () => {
    const res = await request(app)
      .get("/auth/me")
      .set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.user.role).toBe("ADMIN");
  });

  it("blocks unauthenticated access", async () => {
    const res = await request(app).get("/admin/ping");
    expect(res.status).toBe(401);
  });

  it("allows ADMIN and forbids VIEWER on admin routes", async () => {
    const ok = await request(app)
      .get("/admin/ping")
      .set("Authorization", `Bearer ${adminToken}`);
    expect(ok.status).toBe(200);

    await prisma.user.create({
      data: {
        email: viewerEmail,
        passwordHash: await bcrypt.hash(password, 10),
        role: "VIEWER",
        orgId,
      },
    });
    const login = await request(app)
      .post("/auth/login")
      .send({ email: viewerEmail, password });
    const denied = await request(app)
      .get("/admin/ping")
      .set("Authorization", `Bearer ${login.body.token}`);
    expect(denied.status).toBe(403);
  });
});