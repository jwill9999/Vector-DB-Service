import { IncomingMessage, ServerResponse } from "node:http";

import { AppServices } from "../services/types.js";
import { AppConfig } from "../utils/config.js";
import { Logger } from "../utils/logger.js";

export interface RouteContext {
  req: IncomingMessage;
  res: ServerResponse;
  config: AppConfig;
  services: AppServices;
  body: unknown;
  searchParams: URLSearchParams;
  logger: Logger;
}

export type RouteHandler = (context: RouteContext) => Promise<void> | void;
