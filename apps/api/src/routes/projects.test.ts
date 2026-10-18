import { describe, it, expect, afterAll } from "vitest";
import request from "supertest";
import { app } from "../app";
import { prisma } from "../lib/prisma";

const stamp = Date.now();
const password = "supersecret1";

afterAll(async () => {
  await prisma.$disconnect();
});

describe("projects, flags, and audit log", () => {
  let token = "";
  let projectId = "";
  let flagId = "";
  let envId = "";

  it("registers an admin", async () => {
    const res = await request(app)
      .post("/auth/register")
      .send({ email: `proj-${stamp}@test.dev`, password, orgName: "Flag Org" });
    expect(res.status).toBe(201);
    token = res.body.token;
  });

  it("requires authentication", async () => {
    const res = await request(app).get("/projects");
    expect(res.status).toBe(401);
  });

  it("creates a project with two default environments", async () => {
    const res = await request(app)
      .post("/projects")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Checkout App", key: `checkout-${stamp}` });
    expect(res.status).toBe(201);
    expect(res.body.environments).toHaveLength(2);
    projectId = res.body.id;
    envId = res.body.environments[0].id;
  });

  it("creates a flag with a disabled config per environment", async () => {
    const res = await request(app)
      .post(`/projects/${projectId}/flags`)
      .set("Authorization", `Bearer ${token}`)
      .send({ key: "new-checkout", description: "New checkout flow" });
    expect(res.status).toBe(201);
    expect(res.body.configs).toHaveLength(2);
    expect(res.body.configs.every((c: { enabled: boolean }) => c.enabled === false)).toBe(true);
    flagId = res.body.id;
  });

  it("rejects duplicate flag keys", async () => {
    const res = await request(app)
      .post(`/projects/${projectId}/flags`)
      .set("Authorization", `Bearer ${token}`)
      .send({ key: "new-checkout" });
    expect(res.status).toBe(409);
  });

  it("toggles a flag and sets a rollout", async () => {
    const res = await request(app)
      .patch(`/projects/${projectId}/flags/${flagId}/environments/${envId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ enabled: true, rolloutPercentage: 25 });
    expect(res.status).toBe(200);
    expect(res.body.enabled).toBe(true);
    expect(res.body.rolloutPercentage).toBe(25);
  });

  it("validates input", async () => {
    const res = await request(app)
      .patch(`/projects/${projectId}/flags/${flagId}/environments/${envId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ rolloutPercentage: 500 });
    expect(res.status).toBe(400);
  });

  it("records before/after in the audit log", async () => {
    const res = await request(app)
      .get("/projects/audit/logs")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    const update = res.body.find((l: { action: string }) => l.action === "flag.update");
    expect(update.before.enabled).toBe(false);
    expect(update.after.enabled).toBe(true);
  });
  it("explains an evaluation", async () => {
  const res = await request(app)
    .post(`/projects/${projectId}/flags/${flagId}/environments/${envId}/explain`)
    .set("Authorization", `Bearer ${token}`)
    .send({ key: "u1", plan: "free" });
  expect(res.status).toBe(200);
  expect(typeof res.body.explanation).toBe("string");
});

  it("deletes a flag", async () => {
    const res = await request(app)
      .delete(`/projects/${projectId}/flags/${flagId}`)
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(204);
  });
});