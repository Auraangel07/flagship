const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export type Role = "ADMIN" | "DEVELOPER" | "VIEWER";
export interface Session {
  token: string;
  user: { id: string; email: string; role: Role; orgId: string };
}
export interface Environment {
  id: string;
  name: string;
  sdkKey: string;
}
export interface Project {
  id: string;
  name: string;
  key: string;
  environments: Environment[];
}
export interface Rule {
  attribute: string;
  operator: "equals" | "not_equals" | "in" | "contains";
  values: string[];
}
export interface FlagConfig {
  id: string;
  environmentId: string;
  enabled: boolean;
  rolloutPercentage: number;
  rules: Rule[];
  environment: Environment;
}
export interface Flag {
  id: string;
  key: string;
  description: string | null;
  configs: FlagConfig[];
}
export interface AuditEntry {
  id: string;
  action: string;
  entityType: string;
  createdAt: string;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  user: { email: string };
}

const SESSION_KEY = "flagship.session";

export function getSession(): Session | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    return null;
  }
}
export function saveSession(s: Session) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(s));
}
export function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const session = getSession();
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(session ? { Authorization: `Bearer ${session.token}` } : {}),
      ...init.headers,
    },
  });
  if (res.status === 401 && session) {
    clearSession();
    window.location.href = "/login";
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const msg = typeof body.error === "string" ? body.error : `Request failed (${res.status})`;
    throw new Error(msg);
  }
  return res.status === 204 ? (undefined as T) : ((await res.json()) as T);
}