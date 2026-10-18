"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Rule } from "@/lib/api";

const OPERATORS: Rule["operator"][] = ["equals", "not_equals", "in", "contains"];

export function RulesEditor({
  rules,
  disabled,
  onSave,
}: {
  rules: Rule[];
  disabled: boolean;
  onSave: (rules: Rule[]) => void;
}) {
  const [attribute, setAttribute] = useState("plan");
  const [operator, setOperator] = useState<Rule["operator"]>("equals");
  const [values, setValues] = useState("");

  function add() {
    const list = values.split(",").map((v) => v.trim()).filter(Boolean);
    if (!attribute.trim() || list.length === 0) return;
    onSave([...rules, { attribute: attribute.trim(), operator, values: list }]);
    setValues("");
  }

  return (
    <div className="space-y-2 rounded-md border p-3">
      <p className="text-sm font-medium">Targeting rules</p>
      <p className="text-xs text-muted-foreground">
        Users matching any rule get the flag, regardless of rollout %.
      </p>
      {rules.length === 0 && <p className="text-xs text-muted-foreground">No rules yet.</p>}
      {rules.map((r, i) => (
        <div key={i} className="flex items-center justify-between rounded bg-muted/50 px-2 py-1 text-sm">
          <span className="font-mono">
            {r.attribute} {r.operator} {r.values.join(", ")}
          </span>
          {!disabled && (
            <Button variant="ghost" size="sm" className="text-destructive" onClick={() => onSave(rules.filter((_, j) => j !== i))}>
              Remove
            </Button>
          )}
        </div>
      ))}
      {!disabled && (
        <div className="flex flex-wrap gap-2">
          <Input className="w-28" value={attribute} onChange={(e) => setAttribute(e.target.value)} placeholder="attribute" />
          <select
            className="rounded-md border bg-background px-2 text-sm"
            value={operator}
            onChange={(e) => setOperator(e.target.value as Rule["operator"])}
          >
            {OPERATORS.map((o) => (
              <option key={o} value={o}>{o}</option>
            ))}
          </select>
          <Input className="w-40" value={values} onChange={(e) => setValues(e.target.value)} placeholder="pro, enterprise" />
          <Button size="sm" onClick={add}>Add rule</Button>
        </div>
      )}
    </div>
  );
}