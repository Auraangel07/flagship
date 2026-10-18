"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { api, AuditEntry, Flag, FlagConfig, Project, Rule } from "@/lib/api";
import { useSession } from "@/lib/useSession";
import { TopNav } from "@/components/TopNav";
import { RulesEditor } from "@/components/RulesEditor";
import { Explainer } from "@/components/Explainer";
function describe(a: AuditEntry): string {
  const b = a.before as Record<string, unknown> | null;
  const n = a.after as Record<string, unknown> | null;
  if (a.action === "flag.update" && b && n) {
    const parts: string[] = [];
    if (b.enabled !== n.enabled) parts.push(`enabled: ${b.enabled ? "on" : "off"} → ${n.enabled ? "on" : "off"}`);
    if (b.rolloutPercentage !== n.rolloutPercentage) parts.push(`rollout: ${b.rolloutPercentage}% → ${n.rolloutPercentage}%`);
    if (JSON.stringify(b.rules) !== JSON.stringify(n.rules)) parts.push("targeting rules changed");
    return parts.join(", ") || "no visible change";
  }
  if (a.action === "flag.create") return `created flag "${(n as { key?: string } | null)?.key ?? ""}"`;
  if (a.action === "flag.delete") return `deleted flag "${(b as { key?: string } | null)?.key ?? ""}"`;
  if (a.action === "project.create") return `created project "${(n as { name?: string } | null)?.name ?? ""}"`;
  return a.action;
}

export default function ProjectView({ id }: { id: string }) {
  const qc = useQueryClient();
  const [envName, setEnvName] = useState("development");
  const [flagKey, setFlagKey] = useState("");
  const [flagDesc, setFlagDesc] = useState("");

  const session = useSession();

  const project = useQuery({
    queryKey: ["projects"],
    queryFn: () => api<Project[]>("/projects"),
    enabled: !!session,
    select: (all) => all.find((p) => p.id === id),
  });
  const flags = useQuery({
    queryKey: ["flags", id],
    queryFn: () => api<Flag[]>(`/projects/${id}/flags`),
    enabled: !!session,
  });
  const audit = useQuery({
    queryKey: ["audit"],
      queryFn: () => api<{ items: AuditEntry[] }>("/projects/audit/logs?limit=10").then((r) => r.items),
    enabled: !!session,
  });

  const createFlag = useMutation({
    mutationFn: () =>
      api(`/projects/${id}/flags`, {
        method: "POST",
        body: JSON.stringify({ key: flagKey, description: flagDesc || undefined }),
      }),
    onSuccess: () => {
      setFlagKey("");
      setFlagDesc("");
      qc.invalidateQueries({ queryKey: ["flags", id] });
      qc.invalidateQueries({ queryKey: ["audit"] });
      toast.success("Flag created");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateConfig = useMutation({
    mutationFn: (v: {
      flagId: string;
      envId: string;
      patch: Partial<Pick<FlagConfig, "enabled" | "rolloutPercentage" | "rules">>;
    }) =>
      api(`/projects/${id}/flags/${v.flagId}/environments/${v.envId}`, {
        method: "PATCH",
        body: JSON.stringify(v.patch),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["flags", id] });
      qc.invalidateQueries({ queryKey: ["audit"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteFlag = useMutation({
    mutationFn: (flagId: string) => api(`/projects/${id}/flags/${flagId}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["flags", id] });
      qc.invalidateQueries({ queryKey: ["audit"] });
      toast.success("Flag deleted");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!session) return null;
  const role = session.user.role;
  const canEdit = role !== "VIEWER";
  const envs = project.data?.environments ?? [];
  const activeEnv = envs.find((e) => e.name === envName);

  return (
    <>
      <TopNav session={session} />
      <main className="mx-auto max-w-4xl space-y-8 p-6">
        <header className="space-y-3">
          <Link href="/projects" className="text-sm text-muted-foreground hover:underline">
            ← All projects
          </Link>
          <h1 className="text-3xl font-bold">{project.data?.name ?? "Project"}</h1>
          <div className="flex flex-wrap items-center gap-2">
            {envs.map((e) => {
              const isProd = e.name === "production";
              const active = e.name === envName;
              const color = isProd
                ? active
                  ? "bg-amber-500 text-black hover:bg-amber-500"
                  : "border-amber-500/50 text-amber-400"
                : active
                  ? "bg-sky-500 text-black hover:bg-sky-500"
                  : "border-sky-500/50 text-sky-400";
              return (
                <Button key={e.id} size="sm" variant="outline" className={color} onClick={() => setEnvName(e.name)}>
                  {e.name}
                </Button>
              );
            })}
          </div>
          {activeEnv?.name === "production" && (
            <p className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-300">
              ⚠️ Production: changes here affect live users immediately.
            </p>
          )}
          {activeEnv && (
            <p className="text-xs text-muted-foreground">
              SDK key ({activeEnv.name}): <code className="rounded bg-muted px-1.5 py-0.5">{activeEnv.sdkKey}</code>
            </p>
          )}
        </header>

        {canEdit && (
          <form
            className="flex flex-wrap gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              createFlag.mutate();
            }}
          >
            <Input className="w-56" placeholder="flag-key" value={flagKey} onChange={(e) => setFlagKey(e.target.value.toLowerCase())} required />
            <Input className="w-72" placeholder="Description (optional)" value={flagDesc} onChange={(e) => setFlagDesc(e.target.value)} />
            <Button type="submit" disabled={createFlag.isPending}>
              Add flag
            </Button>
          </form>
        )}

        <section className="space-y-4">
          {flags.isLoading && <p className="text-muted-foreground">Loading flags...</p>}
          {flags.data?.length === 0 && <p className="text-muted-foreground">No flags yet.</p>}
          {flags.data?.map((flag) => {
            const cfg = flag.configs.find((c) => c.environmentId === activeEnv?.id);
            if (!cfg) return null;
            return (
              <Card key={flag.id}>
                <CardHeader className="flex flex-row items-start justify-between space-y-0">
                  <div>
                    <CardTitle className="font-mono text-lg">{flag.key}</CardTitle>
                    {flag.description && <CardDescription>{flag.description}</CardDescription>}
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant={cfg.enabled ? "default" : "secondary"}>{cfg.enabled ? "ON" : "OFF"}</Badge>
                    <Switch
                      checked={cfg.enabled}
                      disabled={!canEdit}
                      onCheckedChange={(enabled) =>
                        updateConfig.mutate({ flagId: flag.id, envId: cfg.environmentId, patch: { enabled } })
                      }
                    />
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-xs text-muted-foreground">Updated {new Date(cfg.updatedAt).toLocaleString()}</p>
                  <div className="flex items-center gap-4">
                    <span className="w-28 text-sm text-muted-foreground">Rollout: {cfg.rolloutPercentage}%</span>
                    <Slider
                      className="max-w-md"
                      defaultValue={[cfg.rolloutPercentage]}
                      key={`${cfg.id}-${cfg.rolloutPercentage}`}
                      max={100}
                      step={5}
                      disabled={!canEdit}
                      onValueCommitted={(value) => {
                        const v = Array.isArray(value) ? value[0] : value;
                        updateConfig.mutate({ flagId: flag.id, envId: cfg.environmentId, patch: { rolloutPercentage: v } });
                      }}
                    />
                  </div>
                  <RulesEditor
                    rules={cfg.rules}
                    disabled={!canEdit}
                    onSave={(rules: Rule[]) =>
                      updateConfig.mutate({ flagId: flag.id, envId: cfg.environmentId, patch: { rules } })
                    }
                  />
                  <Explainer projectId={id} flagId={flag.id} envId={cfg.environmentId} />
                  {role === "ADMIN" && (
                    <Button variant="ghost" size="sm" className="text-destructive" onClick={() => deleteFlag.mutate(flag.id)}>
                      Delete flag
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">Audit log</h2>
          <div className="space-y-2">
            {audit.data?.slice(0, 10).map((a) => (
              <div key={a.id} className="flex items-center justify-between rounded-md border p-3 text-sm">
                <div>
                  <span className="font-medium">{describe(a)}</span>
                  <span className="text-muted-foreground"> · {a.user.email}</span>
                </div>
                <span className="text-xs text-muted-foreground">{new Date(a.createdAt).toLocaleString()}</span>
              </div>
            ))}
            {audit.data?.length === 0 && <p className="text-muted-foreground">No activity yet.</p>}
          </div>
        </section>
      </main>
    </>
  );
}