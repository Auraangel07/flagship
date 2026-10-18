"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { api, Project } from "@/lib/api";
import { useSession } from "@/lib/useSession";
import { TopNav } from "@/components/TopNav";

export default function Home() {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [key, setKey] = useState("");

  const session = useSession();

  const projects = useQuery({
    queryKey: ["projects"],
    queryFn: () => api<Project[]>("/projects"),
    enabled: !!session,
  });

  const create = useMutation({
    mutationFn: () => api<Project>("/projects", { method: "POST", body: JSON.stringify({ name, key }) }),
    onSuccess: () => {
      setName("");
      setKey("");
      qc.invalidateQueries({ queryKey: ["projects"] });
      toast.success("Project created");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!session) return null;
  const canCreate = session.user.role !== "VIEWER";

  return (
    <>
      <TopNav session={session} />
      <main className="mx-auto max-w-4xl space-y-8 p-6">
        <div>
          <h1 className="text-3xl font-bold">Projects</h1>
          <p className="text-sm text-muted-foreground">Ship safely. Flip instantly.</p>
        </div>

        {canCreate && (
          <form
            className="flex flex-wrap gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              create.mutate();
            }}
          >
            <Input className="w-56" placeholder="Project name" value={name} onChange={(e) => setName(e.target.value)} required minLength={2} />
            <Input className="w-56" placeholder="key (e.g. checkout-app)" value={key} onChange={(e) => setKey(e.target.value.toLowerCase())} required />
            <Button type="submit" disabled={create.isPending}>
              Create project
            </Button>
          </form>
        )}

        <section className="grid gap-4 sm:grid-cols-2">
          {projects.isLoading && <p className="text-muted-foreground">Loading projects...</p>}
          {projects.data?.length === 0 && <p className="text-muted-foreground">No projects yet. Create your first one above.</p>}
          {projects.data?.map((p) => (
            <Link key={p.id} href={`/projects/${p.id}`}>
              <Card className="transition hover:border-primary">
                <CardHeader>
                  <CardTitle>{p.name}</CardTitle>
                  <CardDescription>
                    {p.key} · {p.environments.length} environments
                  </CardDescription>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </section>
      </main>
    </>
  );
}