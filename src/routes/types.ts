import { IncomingMessage, ServerResponse } from "node:http";

import { AppConfig } from "../config.js";
import { AppServices } from "../services/types.js";

export interface RouteContext {
  req: IncomingMessage;
  res: ServerResponse;
  config: AppConfig;
  services: AppServices;
  body: unknown;
  searchParams: URLSearchParams;
}

export type RouteHandler = (context: RouteContext) => Promise<void> | void;
