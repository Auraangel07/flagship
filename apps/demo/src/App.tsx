import { useEffect, useState } from "react";
import { FlagshipClient } from "@flagship/sdk";
import "./App.css";

const SDK_KEY = "cmvcifj8z0006ujpcgwi1jebg"; // your development key
const API = "http://localhost:4000";

const PRODUCTS = [
  { name: "Trail Runner Shoes", price: 89 },
  { name: "Insulated Bottle", price: 24 },
  { name: "Daypack 20L", price: 59 },
];

export default function App() {
  const [client, setClient] = useState<FlagshipClient | null>(null);
  const [, setTick] = useState(0);
  const [ready, setReady] = useState(false);
  const [plan, setPlan] = useState("free");

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
    const off = c.onChange(() => setTick((t) => t + 1));
    return () => {
      off();
      c.close();
    };
  }, [plan]);

  const on = (k: string) => client?.isEnabled(k) ?? false;
  const checkoutOn = on("new-checkout");

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
    <div className="shop">
      {on("dark-banner") && (
        <div className="banner">🔥 Flash sale: 30% off everything this weekend</div>
      )}
      <header>
        <h1>Acme Outfitters</h1>
        <label>
          Shopper plan:{" "}
          <select value={plan} onChange={(e) => setPlan(e.target.value)}>
            <option value="free">free</option>
            <option value="pro">pro</option>
          </select>
        </label>
      </header>
      <div className="grid">
        {PRODUCTS.map((p) => (
          <div className="card" key={p.name}>
            <h3>{p.name}</h3>
            <p>${p.price}</p>
          </div>
        ))}
      </div>
      <div className="checkout">
        {checkoutOn ? (
          <>
            <button className="new">⚡ One-tap checkout</button>
            <button className="old" style={{ marginLeft: 12 }} onClick={breakIt}>
              💥 Break it
            </button>
          </>
        ) : (
          <button className="old">Proceed to checkout</button>
        )}
      </div>
      <footer>{ready ? "● Live: connected to Flagship" : "○ Connecting..."}</footer>
    </div>
  );
}