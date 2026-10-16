import { createHash } from "node:crypto";

export type Operator = "equals" | "not_equals" | "in" | "contains";

export interface Rule {
  attribute: string;
  operator: Operator;
  values: string[];
}

export interface FlagConfigInput {
  enabled: boolean;
  rolloutPercentage: number; // 0-100
  rules: Rule[];
}

export interface UserContext {
  key: string;
  [attribute: string]: string;
}

export type Reason = "DISABLED" | "RULE_MATCH" | "ROLLOUT" | "FALLTHROUGH";

export interface EvalResult {
  value: boolean;
  reason: Reason;
}

// Deterministic bucket 0-99: same user + flag always lands in the same bucket.
export function bucket(flagKey: string, userKey: string): number {
  const hash = createHash("sha256").update(`${flagKey}:${userKey}`).digest();
  return hash.readUInt32BE(0) % 100;
}

function ruleMatches(rule: Rule, user: UserContext): boolean {
  const actual = user[rule.attribute];
  if (actual === undefined) return false;
  switch (rule.operator) {
    case "equals":
      return actual === rule.values[0];
    case "not_equals":
      return actual !== rule.values[0];
    case "in":
      return rule.values.includes(actual);
    case "contains":
      return rule.values.some((v) => actual.includes(v));
  }
}

export function evaluate(
  flagKey: string,
  config: FlagConfigInput,
  user: UserContext
): EvalResult {
  if (!config.enabled) return { value: false, reason: "DISABLED" };

  if (config.rules.some((r) => ruleMatches(r, user))) {
    return { value: true, reason: "RULE_MATCH" };
  }

  if (bucket(flagKey, user.key) < config.rolloutPercentage) {
    return { value: true, reason: "ROLLOUT" };
  }

  return { value: false, reason: "FALLTHROUGH" };
}