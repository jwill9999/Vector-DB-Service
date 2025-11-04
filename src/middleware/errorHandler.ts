import { ServerResponse } from "node:http";

import { Logger } from "../utils/logger.js";

export function handleRouteError(res: ServerResponse, error: unknown, logger: Logger): void {
  logger.error({ err: error }, "route error");

  if (res.writableEnded) {
    return;
  }

  res.statusCode = 500;
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.end(JSON.stringify({ error: "internal_error" }));
}
