import { NextFunction, Request, Response } from "express";
import { logger } from "../lib/logger";

export function notFound(_req: Request, res: Response) {
  res.status(404).json({ error: "Not found" });
}

// Express recognises error handlers by their four arguments.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  const requestId = res.getHeader("x-request-id");
  logger.error({ err, requestId, url: req.url }, "unhandled error");
  if (res.headersSent) return;
  res.status(500).json({ error: "Internal server error", requestId });
}