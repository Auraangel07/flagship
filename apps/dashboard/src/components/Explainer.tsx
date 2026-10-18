"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";

interface Explanation {
  value: boolean;
  reason: string;
  bucket: number;
  explanation: string;
}

export function Explainer({ projectId, flagId, envId }: { projectId: string; flagId: string; envId: string }) {
  const [userKey, setUserKey] = useState("user-123");
  const [attrs, setAttrs] = useState("plan=free");
  const [result, setResult] = useState<Explanation | null>(null);
  const [error, setError] = useState("");

  async function explain() {
    setError("");
    const body: Record<string, string> = { key: userKey };
    for (const pair of attrs.split(",")) {
      const [k, v] = pair.split("=").map((s) => s.trim());
      if (k && v) body[k] = v;
    }
    try {
      setResult(await api<Explanation>(`/projects/${projectId}/flags/${flagId}/environments/${envId}/explain`, {
        method: "POST",
        body: JSON.stringify(body),
      }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    }
  }

  return (
    <div className="space-y-2 rounded-md border p-3">
      <p className="text-sm font-medium">Why did this user get that result?</p>
      <div className="flex flex-wrap gap-2">
        <Input className="w-36" value={userKey} onChange={(e) => setUserKey(e.target.value)} placeholder="user key" />
        <Input className="w-56" value={attrs} onChange={(e) => setAttrs(e.target.value)} placeholder="plan=pro, country=IN" />
        <Button size="sm" variant="outline" onClick={explain}>Explain</Button>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
      {result && (
        <p className={`rounded px-2 py-1 text-sm ${result.value ? "bg-emerald-500/15 text-emerald-300" : "bg-muted text-muted-foreground"}`}>
          {result.explanation}
        </p>
      )}
    </div>
  );
}