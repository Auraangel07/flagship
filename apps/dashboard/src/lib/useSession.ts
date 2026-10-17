"use client";

import { useRouter } from "next/navigation";
import { useEffect, useSyncExternalStore } from "react";
import { getSession, Session } from "./api";

// Read the session from localStorage without setState-in-effect.
// Cached by raw string so the snapshot stays referentially stable.
let lastRaw: string | null = null;
let lastValue: Session | null = null;

function snapshot(): Session | null {
  const raw = localStorage.getItem("flagship.session");
  if (raw !== lastRaw) {
    lastRaw = raw;
    lastValue = getSession();
  }
  return lastValue;
}

function subscribe(cb: () => void) {
  window.addEventListener("storage", cb);
  return () => window.removeEventListener("storage", cb);
}

export function useSession(): Session | null {
  const router = useRouter();
  const session = useSyncExternalStore(subscribe, snapshot, () => null);

  useEffect(() => {
    if (!getSession()) router.replace("/login");
  }, [router]);

  return session;
}