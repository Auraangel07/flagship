import { Router } from "express";
import { z } from "zod";
import { evaluate } from "../engine/evaluate";
import { getSnapshot, cacheStats } from "../lib/cache";
import { addClient, removeClient, connectedClients } from "../lib/events";

export const sdkRouter = Router();

const userSchema = z.object({ key: z.string().min(1) }).catchall(z.string());

const stats = { evaluations: 0, totalMs: 0 };

sdkRouter.post("/evaluate", async (req, res) => {
  const t0 = performance.now();
  const sdkKey = req.header("x-sdk-key");
  if (!sdkKey) return res.status(401).json({ error: "Missing x-sdk-key" });

  const parsed = z.object({ flagKey: z.string().min(1), user: userSchema }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const snap = await getSnapshot(sdkKey);
  if (!snap) return res.status(401).json({ error: "Invalid SDK key" });

  const cfg = snap.flags[parsed.data.flagKey];
  if (!cfg) return res.status(404).json({ error: "Flag not found" });

  const result = evaluate(parsed.data.flagKey, cfg, parsed.data.user);
  stats.evaluations++;
  stats.totalMs += performance.now() - t0;
  res.json({ flagKey: parsed.data.flagKey, ...result });
});

// Evaluate every flag for a user in one call (what the SDK uses)
sdkRouter.post("/evaluate-all", async (req, res) => {
  const t0 = performance.now();
  const sdkKey = req.header("x-sdk-key");
  if (!sdkKey) return res.status(401).json({ error: "Missing x-sdk-key" });

  const parsed = z.object({ user: userSchema }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const snap = await getSnapshot(sdkKey);
  if (!snap) return res.status(401).json({ error: "Invalid SDK key" });

  const flags: Record<string, { value: boolean; reason: string }> = {};
  for (const [key, cfg] of Object.entries(snap.flags)) {
    flags[key] = evaluate(key, cfg, parsed.data.user);
  }
  stats.evaluations += Object.keys(flags).length;
  stats.totalMs += performance.now() - t0;
  res.json({ flags });
});

// Live updates via Server-Sent Events (EventSource can't set headers, so key is in the URL)
sdkRouter.get("/stream", async (req, res) => {
  const sdkKey = String(req.query.sdkKey ?? "");
  const snap = sdkKey ? await getSnapshot(sdkKey) : null;
  if (!snap) return res.status(401).json({ error: "Invalid SDK key" });

  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });
  res.write("event: connected\ndata: {}\n\n");
  addClient(sdkKey, res);

  const heartbeat = setInterval(() => res.write(": ping\n\n"), 25_000);
  req.on("close", () => {
    clearInterval(heartbeat);
    removeClient(sdkKey, res);
  });
});

// Handy numbers for your report
sdkRouter.get("/stats", (_req, res) => {
  const total = cacheStats.hits + cacheStats.misses;
  res.json({
    evaluations: stats.evaluations,
    avgLatencyMs: stats.evaluations ? +(stats.totalMs / stats.evaluations).toFixed(3) : 0,
    cacheHitRate: total ? +(cacheStats.hits / total).toFixed(3) : 0,
    streamClients: connectedClients(),
  });
});