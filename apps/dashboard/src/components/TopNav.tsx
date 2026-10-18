"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { clearSession, Session } from "@/lib/api";

export function TopNav({ session }: { session: Session }) {
  const router = useRouter();
  return (
    <nav className="border-b bg-background/80 backdrop-blur">
      <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-3">
        <Link href="/projects" className="text-lg font-bold tracking-tight">
          🚩 Flagship
        </Link>
        <div className="flex items-center gap-3">
          <Badge variant="secondary">{session.user.role}</Badge>
          <span className="hidden text-sm text-muted-foreground sm:inline">{session.user.email}</span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              clearSession();
              router.push("/login");
            }}
          >
            Sign out
          </Button>
        </div>
      </div>
    </nav>
  );
}