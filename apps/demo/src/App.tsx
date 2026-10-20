import { useEffect, useState } from "react";
import { FlagshipClient } from "@flagship/sdk";
import "./App.css";

const SDK_KEY = import.meta.env.VITE_SDK_KEY as string;
const API = (import.meta.env.VITE_API_URL as string) ?? "http://localhost:4000";

const PRODUCTS = [
  { name: "Trail Runner Shoes", price: 89, emoji: "👟", tag: "Bestseller" },
  { name: "Insulated Bottle", price: 24, emoji: "🧴", tag: "New" },
  { name: "Daypack 20L", price: 59, emoji: "🎒", tag: "Popular" },
];

interface LogEntry {
  id: number;
  time: string;
  text: string;
}

export default function App() {
  const [client, setClient] = useState<FlagshipClient | null>(null);
  const [, setTick] = useState(0);
  const [ready, setReady] = useState(false);
  const [plan, setPlan] = useState("free");
  const [pulse, setPulse] = useState(false);
  const [log, setLog] = useState<LogEntry[]>([]);
  const [cart, setCart] = useState(0);

  useEffect(() => {
    const c = new FlagshipClient({
      sdkKey: SDK_KEY,
      baseUrl: API,
      user: { key: "demo-user", plan },
    });
    c.init()
      .then(() => {
        setClient(c);
        setReady(true);
      })
      .catch(() => setReady(false));
    const off = c.onChange(() => {
      setTick((t) => t + 1);
      setPulse(true);
      setTimeout(() => setPulse(false), 1200);
      setLog((l) =>
        [{ id: Date.now(), time: new Date().toLocaleTimeString(), text: "Flags updated from Flagship" }, ...l].slice(0, 6)
      );
    });
    return () => {
      off();
      c.close();
    };
  }, [plan]);

  const on = (k: string) => client?.isEnabled(k) ?? false;
  const checkoutOn = on("new-checkout");
  const flags = Object.entries(client?.getAll() ?? {});

  useEffect(() => {
    if (client && checkoutOn) client.reportExposure("new-checkout");
  }, [client, checkoutOn]);

  function breakIt() {
    if (!client) return;
    for (let i = 0; i < 20; i++) client.reportExposure("new-checkout");
    for (let i = 0; i < 6; i++) client.reportError("new-checkout");
    void client.flush();
  }

  return (
    <div className="layout">
      <main className="shop">
        {on("dark-banner") && <div className="banner">🔥 Flash sale: 30% off everything this weekend</div>}

        <header className="top">
          <div>
            <h1>Acme Outfitters</h1>
            <p className="sub">Gear for the trail ahead</p>
          </div>
          <div className="right">
            <label className="plan">
              Shopper plan
              <select value={plan} onChange={(e) => setPlan(e.target.value)}>
                <option value="free">free</option>
                <option value="pro">pro</option>
              </select>
            </label>
            <div className="cart">🛒 {cart}</div>
          </div>
        </header>

        <section className="grid">
          {PRODUCTS.map((p) => (
            <div className="card" key={p.name}>
              <span className="chip">{p.tag}</span>
              <div className="emoji">{p.emoji}</div>
              <h3>{p.name}</h3>
              <p className="price">${p.price}</p>
              <button className="add" onClick={() => setCart((n) => n + 1)}>
                Add to cart
              </button>
            </div>
          ))}
        </section>

        <div className="checkout">
          {checkoutOn ? (
            <>
              <button className="new">⚡ One-tap checkout</button>
              <button className="danger" onClick={breakIt}>
                💥 Break it
              </button>
            </>
          ) : (
            <button className="old">Proceed to checkout</button>
          )}
        </div>
      </main>

      <aside className="panel">
        <div className="panel-head">
          <h2>Flagship</h2>
          <span className={`live ${ready ? "up" : ""} ${pulse ? "pulse" : ""}`}>
            {ready ? "● LIVE" : "○ CONNECTING"}
          </span>
        </div>
        <p className="muted">
          Evaluating for <b>demo-user</b> · plan <b>{plan}</b>
        </p>

        <h4>Flags</h4>
        <ul className="flags">
          {flags.length === 0 && <li className="muted">No flags loaded</li>}
          {flags.map(([key, r]) => (
            <li key={key} className={r.value ? "on" : "off"}>
              <div>
                <code>{key}</code>
                <small>{r.reason.toLowerCase().replace("_", " ")}</small>
              </div>
              <span className="state">{r.value ? "ON" : "OFF"}</span>
            </li>
          ))}
        </ul>

        <h4>Activity</h4>
        <ul className="feed">
          {log.length === 0 && <li className="muted">Waiting for changes... flip a flag in the dashboard.</li>}
          {log.map((e) => (
            <li key={e.id}>
              <span>{e.time}</span> {e.text}
            </li>
          ))}
        </ul>
      </aside>
    </div>
  );
}