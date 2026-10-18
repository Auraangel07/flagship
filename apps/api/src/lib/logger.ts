import pino from "pino";
import { env } from "../env";

export const logger = pino({
  level: env.NODE_ENV === "test" ? "silent" : "info",
  ...(env.NODE_ENV === "development"
    ? { transport: { target: "pino-pretty", options: { colorize: true, translateTime: "HH:MM:ss" } } }
    : {}),
  redact: ["req.headers.authorization", "req.headers.cookie", "req.headers['x-sdk-key']"],
});