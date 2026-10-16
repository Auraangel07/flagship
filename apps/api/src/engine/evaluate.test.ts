import { describe, it, expect } from "vitest";
import { evaluate, bucket } from "./evaluate";

const base = { enabled: true, rolloutPercentage: 0, rules: [] };

describe("evaluate", () => {
  it("returns false when disabled", () => {
    const r = evaluate("f", { ...base, enabled: false, rolloutPercentage: 100 }, { key: "u1" });
    expect(r).toEqual({ value: false, reason: "DISABLED" });
  });

  it("matches targeting rules", () => {
    const cfg = { ...base, rules: [{ attribute: "plan", operator: "equals" as const, values: ["pro"] }] };
    expect(evaluate("f", cfg, { key: "u1", plan: "pro" }).reason).toBe("RULE_MATCH");
    expect(evaluate("f", cfg, { key: "u1", plan: "free" }).value).toBe(false);
  });

  it("is deterministic per user", () => {
    expect(bucket("f", "alice")).toBe(bucket("f", "alice"));
  });

  it("rolls out to roughly the requested percentage", () => {
    const cfg = { ...base, rolloutPercentage: 30 };
    let on = 0;
    for (let i = 0; i < 10000; i++) {
      if (evaluate("f", cfg, { key: `user-${i}` }).value) on++;
    }
    expect(on / 10000).toBeGreaterThan(0.27);
    expect(on / 10000).toBeLessThan(0.33);
  });
});