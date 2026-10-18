export type User = { key: string; [attribute: string]: string };

export interface EvalResult {
  value: boolean;
  reason: string;
}

interface EventSourceLike {
  addEventListener(type: string, cb: (e: unknown) => void): void;
  close(): void;
}
type EventSourceCtor = new (url: string) => EventSourceLike;

export interface FlagshipOptions {
  sdkKey: string;
  baseUrl: string;
  user: User;
  /** Injectable for tests / non-browser runtimes */
  fetchImpl?: typeof fetch;
  eventSourceImpl?: EventSourceCtor;
}

export class FlagshipClient {
  private flags: Record<string, EvalResult> = {};
  private listeners = new Set<() => void>();
  private queue: { flagKey: string; type: "exposure" | "error" }[] = [];
  private timer: ReturnType<typeof setTimeout> | null = null;
  private stream: EventSourceLike | null = null;
  private user: User;
  private baseUrl: string;
  private fetchFn: typeof fetch;
  private ES?: EventSourceCtor;

  constructor(private opts: FlagshipOptions) {
    this.user = opts.user;
    this.baseUrl = opts.baseUrl.replace(/\/+$/, "");
    this.fetchFn = opts.fetchImpl ?? ((...a) => fetch(...a));
    this.ES =
      opts.eventSourceImpl ??
      (globalThis as unknown as { EventSource?: EventSourceCtor }).EventSource;
  }

  /** Load all flags, then start listening for live changes. */
  async init(): Promise<void> {
    await this.load();
    if (this.ES && !this.stream) {
      const url = `${this.baseUrl}/v1/stream?sdkKey=${encodeURIComponent(this.opts.sdkKey)}`;
      this.stream = new this.ES(url);
      this.stream.addEventListener("flags", () => {
        this.load()
          .then(() => this.emit())
          .catch(() => {
            /* keep last known flags if the refresh fails */
          });
      });
    }
  }

  isEnabled(flagKey: string, defaultValue = false): boolean {
    return this.flags[flagKey]?.value ?? defaultValue;
  }

  getAll(): Record<string, EvalResult> {
    return { ...this.flags };
  }

  /** Switch to a different user and re-evaluate. */
  async identify(user: User): Promise<void> {
    this.user = user;
    await this.load();
    this.emit();
  }

  /** Subscribe to flag changes. Returns an unsubscribe function. */
  onChange(cb: () => void): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

    /** Record that this user was served the flag as ON. */
  reportExposure(flagKey: string): void {
    this.enqueue({ flagKey, type: "exposure" });
  }

  /** Record an error that happened while the flag was ON. */
  reportError(flagKey: string): void {
    this.enqueue({ flagKey, type: "error" });
  }

  private enqueue(e: { flagKey: string; type: "exposure" | "error" }) {
    this.queue.push(e);
    if (this.queue.length >= 50) void this.flush();
    else if (!this.timer) this.timer = setTimeout(() => void this.flush(), 1000);
  }

  async flush(): Promise<void> {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    const events = this.queue.splice(0, 100);
    if (events.length === 0) return;
    try {
      await this.fetchFn(`${this.baseUrl}/v1/events`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-sdk-key": this.opts.sdkKey },
        body: JSON.stringify({ events }),
      });
    } catch {
      /* telemetry must never break the host app */
    }
  }

  close(): void {
    this.flush();
    this.stream?.close();
    this.stream = null;
    this.listeners.clear();
  }

  private emit() {
    for (const cb of this.listeners) cb();
  }

  private async load(): Promise<void> {
    const res = await this.fetchFn(`${this.baseUrl}/v1/evaluate-all`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-sdk-key": this.opts.sdkKey },
      body: JSON.stringify({ user: this.user }),
    });
    if (!res.ok) throw new Error(`Flagship: request failed (${res.status})`);
    const data = (await res.json()) as { flags: Record<string, EvalResult> };
    this.flags = data.flags;
  }
}