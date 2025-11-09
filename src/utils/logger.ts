import pinoLogger from "pino";

import { EnvironmentName } from "./config.js";

export function createLogger(env: EnvironmentName) {
  const isDevelopment = env === "development";

  return pinoLogger({
    level: process.env.LOG_LEVEL || (env === "test" ? "silent" : "info"),
    transport: isDevelopment
      ? {
          target: "pino-pretty",
          options: {
            colorize: true,
            translateTime: "HH:MM:ss Z",
            ignore: "pid,hostname",
          },
        }
      : undefined,
  });
}

export type Logger = ReturnType<typeof createLogger>;
