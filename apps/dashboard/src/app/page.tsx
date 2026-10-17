import Link from "next/link";
import { Button } from "@/components/ui/button";

const FEATURES = [
  { icon: "⚡", title: "Instant updates", text: "Flip a flag and every connected app changes in about a second. No redeploy, no refresh." },
  { icon: "🎯", title: "Smart targeting", text: "Roll out by percentage or target users by plan, country, or any attribute you define." },
  { icon: "🛡️", title: "Audit trail", text: "Every change is logged with who, when, and the exact before and after values." },
  { icon: "🔐", title: "Role-based access", text: "Admins, developers, and viewers. Production stays safe from accidental edits." },
];

const STEPS = [
  { n: "1", title: "Create a flag", text: "Name it, pick an environment, leave it off." },
  { n: "2", title: "Wrap your feature", text: "One line with the SDK: isEnabled('new-checkout')." },
  { n: "3", title: "Roll it out", text: "Go from 5% to 100% from the dashboard, and roll back in a click." },
];

export default function Landing() {
  return (
    <main className="min-h-screen">
      <nav className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
        <span className="text-xl font-bold tracking-tight">Flagship</span>
        <div className="flex gap-3">
          <Link href="/login">
            <Button variant="ghost">Sign in</Button>
          </Link>
          <Link href="/login">
            <Button>Get started</Button>
          </Link>
        </div>
      </nav>

      <section className="relative mx-auto max-w-5xl px-6 pb-20 pt-16 text-center">
        <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-72 bg-gradient-to-b from-emerald-500/15 via-cyan-500/5 to-transparent blur-2xl" />
        <span className="rounded-full border px-3 py-1 text-xs text-muted-foreground">
          Feature flags and experimentation platform
        </span>
        <h1 className="mx-auto mt-6 max-w-3xl text-5xl font-extrabold leading-tight tracking-tight sm:text-6xl">
          Ship safely.{" "}
          <span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
            Flip instantly.
          </span>
        </h1>
        <p className="mx-auto mt-6 w-fit rounded-md border bg-muted/40 px-4 py-2 font-mono text-xs text-muted-foreground">
          Release features to the right users, at the right pace, and turn them off the moment something looks wrong.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Link href="/login">
            <Button size="lg">Open the dashboard</Button>
          </Link>
          <a href="#how">
            <Button size="lg" variant="outline">How it works</Button>
          </a>
        </div>
        <p className="mx-auto mt-6 w-fit rounded-md border bg-muted/40 px-4 py-2 font-mono text-xs text-muted-foreground">
          if (flagship.isEnabled(&quot;new-checkout&quot;)) {"{"} showNewCheckout() {"}"}
        </p>
      </section>

      <section className="mx-auto grid max-w-5xl gap-4 px-6 pb-20 sm:grid-cols-2">
        {FEATURES.map((f) => (
          <div key={f.title} className="rounded-xl border bg-card p-6 transition hover:border-emerald-400/60">
            <div className="text-2xl">{f.icon}</div>
            <h3 className="mt-3 text-lg font-semibold">{f.title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{f.text}</p>
          </div>
        ))}
      </section>

      <section id="how" className="mx-auto max-w-5xl px-6 pb-24">
        <h2 className="mb-8 text-center text-3xl font-bold">How it works</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {STEPS.map((s) => (
            <div key={s.n} className="rounded-xl border p-6">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/20 text-sm font-bold text-emerald-300">
                {s.n}
              </div>
              <h3 className="mt-3 font-semibold">{s.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{s.text}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t py-8 text-center text-sm text-muted-foreground">
        Built with Next.js, Express, Prisma, and PostgreSQL.
      </footer>
    </main>
  );
}