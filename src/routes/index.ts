import { docsHandler } from "./docs.js";
import { googleDriveWebhookHandler } from "./googleDriveWebhook.js";
import { healthHandler } from "./health.js";
import { openApiHandler } from "./openapi.js";
import { searchHandler } from "./search.js";
import { RouteHandler } from "./types.js";

export interface RouteDefinition {
  method: string;
  pathname: string;
  handler: RouteHandler;
}

export const routes: RouteDefinition[] = [
  { method: "GET", pathname: "/docs", handler: docsHandler },
  { method: "GET", pathname: "/openapi.json", handler: openApiHandler },
  { method: "GET", pathname: "/healthz", handler: healthHandler },
  { method: "POST", pathname: "/webhooks/google-drive", handler: googleDriveWebhookHandler },
  { method: "POST", pathname: "/search", handler: searchHandler },
];
