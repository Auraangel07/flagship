import { describe, it, expect, vi } from "vitest";
import { FlagshipClient } from "./index";

class FakeEventSource {
  static last: FakeEventSource;
  listeners: Record<string, (e: unknown) => void> = {};
  closed = false;
  constructor(public url: string) {
    FakeEventSource.last = this;
  }
  addEventListener(type: string, cb: (e: unknown) => void) {
    this.listeners[type] = cb;
  }
  emit(type: string) {
    this.listeners[type]?.({});
  }
  close() {
    this.closed = true;
  }
}

function mockFetch(responses: object[], ok = true, status = 200) {
  let i = 0;
  return vi.fn(async () => ({
    ok,
    status,
    json: async () => responses[Math.min(i++, responses.length - 1)],
  })) as unknown as typeof fetch & ReturnType<typeof vi.fn>;
}

const on = { flags: { "beta-ui": { value: true, reason: "ROLLOUT" } } };
const off = { flags: { "beta-ui": { value: false, reason: "DISABLED" } } };

const make = (fetchImpl: typeof fetch) =>
  new FlagshipClient({
    sdkKey: "key123",
    baseUrl: "http://localhost:4000/",
    user: { key: "u1", plan: "pro" },
    fetchImpl,
    eventSourceImpl: FakeEventSource,
  });

describe("FlagshipClient", () => {
  it("loads flags and answers isEnabled with defaults", async () => {
    const client = make(mockFetch([on]));
    await client.init();
    expect(client.isEnabled("beta-ui")).toBe(true);
    expect(client.isEnabled("missing")).toBe(false);
    expect(client.isEnabled("missing", true)).toBe(true);
  });

  it("sends the SDK key and user to the API", async () => {
    const f = mockFetch([on]);
    await make(f).init();
    const [url, init] = (f as unknown as ReturnType<typeof vi.fn>).mock.calls[0] as [string, RequestInit];
    expect(url).toBe("http://localhost:4000/v1/evaluate-all");
    expect((init.headers as Record<string, string>)["x-sdk-key"]).toBe("key123");
    expect(JSON.parse(init.body as string).user.plan).toBe("pro");
  });

  it("updates live when the stream announces a change", async () => {
    const client = make(mockFetch([on, off]));
    await client.init();
    expect(client.isEnabled("beta-ui")).toBe(true);

    const changed = new Promise<void>((resolve) => client.onChange(resolve));
    FakeEventSource.last.emit("flags");
    await changed;
    expect(client.isEnabled("beta-ui")).toBe(false);
  });

  it("closes the stream on close()", async () => {
    const client = make(mockFetch([on]));
    await client.init();
    client.close();
    expect(FakeEventSource.last.closed).toBe(true);
  });

  it("throws on an invalid SDK key", async () => {
    const client = make(mockFetch([{}], false, 401));
    await expect(client.init()).rejects.toThrow("401");
  });
});