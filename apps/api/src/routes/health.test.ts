import { describe, it, expect, afterAll } from "vitest";
import request from "supertest";
import { app } from "../app";
import { prisma } from "../lib/prisma";

afterAll(async () => {
  await prisma.$disconnect();
});

describe("health endpoints", () => {
  it("reports liveness", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
  });

  it("reports readiness with the database up", async () => {
    const res = await request(app).get("/ready");
    expect(res.status).toBe(200);
    expect(res.body.database).toBe("up");
  });
});
it("returns JSON for unknown routes", async () => {
  const res = await request(app).get("/does-not-exist");
  expect(res.status).toBe(404);
  expect(res.body.error).toBe("Not found");
});