import { Response } from "express";

const clients = new Map<string, Set<Response>>();

export function addClient(sdkKey: string, res: Response) {
  if (!clients.has(sdkKey)) clients.set(sdkKey, new Set());
  clients.get(sdkKey)!.add(res);
}

export function removeClient(sdkKey: string, res: Response) {
  clients.get(sdkKey)?.delete(res);
}

export function broadcast(sdkKey: string, payload: object) {
  for (const res of clients.get(sdkKey) ?? []) {
    res.write(`event: flags\ndata: ${JSON.stringify(payload)}\n\n`);
  }
}

export function connectedClients(): number {
  let n = 0;
  for (const set of clients.values()) n += set.size;
  return n;
}