import { describe, it, expect, afterAll } from "vitest";
import request from "supertest";
import { app } from "../app";
import { prisma } from "../lib/prisma";

const stamp = Date.now();

afterAll(async () => {
  await prisma.$disconnect();
});

describe("public SDK API", () => {
  let token = "";
  let projectId = "";
  let flagId = "";
  let envId = "";
  let sdkKey = "";

  it("sets up org, project and flag", async () => {
    const reg = await request(app)
      .post("/auth/register")
      .send({ email: `sdk-${stamp}@test.dev`, password: "supersecret1", orgName: "SDK Org" });
    token = reg.body.token;

    const proj = await request(app)
      .post("/projects")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "SDK Test", key: `sdk-${stamp}` });
    projectId = proj.body.id;
    envId = proj.body.environments[0].id;
    sdkKey = proj.body.environments[0].sdkKey;

    const flag = await request(app)
      .post(`/projects/${projectId}/flags`)
      .set("Authorization", `Bearer ${token}`)
      .send({ key: "beta-ui" });
    flagId = flag.body.id;
    expect(flag.status).toBe(201);
  });

  it("rejects missing and invalid SDK keys", async () => {
    const none = await request(app).post("/v1/evaluate").send({ flagKey: "beta-ui", user: { key: "u1" } });
    expect(none.status).toBe(401);
    const bad = await request(app)
      .post("/v1/evaluate")
      .set("x-sdk-key", "nope")
      .send({ flagKey: "beta-ui", user: { key: "u1" } });
    expect(bad.status).toBe(401);
  });

  it("returns false while the flag is disabled", async () => {
    const res = await request(app)
      .post("/v1/evaluate")
      .set("x-sdk-key", sdkKey)
      .send({ flagKey: "beta-ui", user: { key: "u1" } });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ value: false, reason: "DISABLED" });
  });

  it("sees a toggle immediately (cache invalidation)", async () => {
    await request(app)
      .patch(`/projects/${projectId}/flags/${flagId}/environments/${envId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ enabled: true, rolloutPercentage: 100 });

    const res = await request(app)
      .post("/v1/evaluate")
      .set("x-sdk-key", sdkKey)
      .send({ flagKey: "beta-ui", user: { key: "u1" } });
    expect(res.body).toMatchObject({ value: true, reason: "ROLLOUT" });
  });

  it("applies targeting rules", async () => {
    await request(app)
      .patch(`/projects/${projectId}/flags/${flagId}/environments/${envId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        enabled: true,
        rolloutPercentage: 0,
        rules: [{ attribute: "plan", operator: "equals", values: ["pro"] }],
      });

    const pro = await request(app)
      .post("/v1/evaluate")
      .set("x-sdk-key", sdkKey)
      .send({ flagKey: "beta-ui", user: { key: "u1", plan: "pro" } });
    expect(pro.body).toMatchObject({ value: true, reason: "RULE_MATCH" });

    const free = await request(app)
      .post("/v1/evaluate")
      .set("x-sdk-key", sdkKey)
      .send({ flagKey: "beta-ui", user: { key: "u2", plan: "free" } });
    expect(free.body.value).toBe(false);
  });
  

  it("evaluates all flags in one call", async () => {
    const res = await request(app)
      .post("/v1/evaluate-all")
      .set("x-sdk-key", sdkKey)
      .send({ user: { key: "u1", plan: "pro" } });
    expect(res.status).toBe(200);
    expect(res.body.flags["beta-ui"].value).toBe(true);
  });

  it("returns 404 for unknown flags and exposes stats", async () => {
    const res = await request(app)
      .post("/v1/evaluate")
      .set("x-sdk-key", sdkKey)
      .send({ flagKey: "ghost", user: { key: "u1" } });
    expect(res.status).toBe(404);

    it("auto-rolls back a flag with a high error rate", async () => {
    const events = [
      ...Array.from({ length: 20 }, () => ({ flagKey: "beta-ui", type: "exposure" as const })),
      ...Array.from({ length: 5 }, () => ({ flagKey: "beta-ui", type: "error" as const })),
    ];
    const res = await request(app).post("/v1/events").set("x-sdk-key", sdkKey).send({ events });
    expect(res.status).toBe(202);
    expect(res.body.rolledBack).toContain("beta-ui");

    const after = await request(app)
      .post("/v1/evaluate")
      .set("x-sdk-key", sdkKey)
      .send({ flagKey: "beta-ui", user: { key: "u1", plan: "pro" } });
    expect(after.body.value).toBe(false);
  });

    const stats = await request(app).get("/v1/stats");
    expect(stats.body.evaluations).toBeGreaterThan(0);
  });
});