import {
  IncomingMessage,
  Server as HttpServer,
  ServerResponse,
  createServer as createHttpServer,
} from "node:http";
import { URL } from "node:url";

import { AppConfig } from "./config.js";
import { RouteDefinition, routes } from "./routes/index.js";
import { RouteContext } from "./routes/types.js";
import { AppServices } from "./services/types.js";

export function createServer(config: AppConfig, services: AppServices): HttpServer {
  const server = createHttpServer(async (req, res) => {
    if (!req.url || !req.method) {
      sendNotFound(res);
      return;
    }

    const routeMatch = matchRoute(req.method, req.url);
    if (!routeMatch) {
      sendNotFound(res);
      return;
    }

    try {
      const { searchParams } = routeMatch.url;
      const body = await readBody(req);
      const context: RouteContext = {
        req,
        res,
        config,
        services,
        body,
        searchParams,
      };

      await routeMatch.route.handler(context);
    } catch (error) {
      handleRouteError(res, error);
    }
  });

  server.on("listening", () => {
    const address = server.address();
    if (typeof address === "object" && address) {
      const host = address.address === "::" ? config.host : address.address;
      console.log(`service listening on http://${host}:${address.port}`);
    }
  });

  return server;
}

function matchRoute(
  method: string,
  requestUrl: string
): { route: RouteDefinition; url: URL } | undefined {
  const targetUrl = new URL(requestUrl, "http://localhost");
  const route = routes.find(
    (entry) => entry.method === method && entry.pathname === targetUrl.pathname
  );
  if (!route) {
    return undefined;
  }

  return { route, url: targetUrl };
}

async function readBody(req: IncomingMessage): Promise<unknown> {
  if (req.method === "GET" || req.method === "HEAD") {
    return undefined;
  }

  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }

  if (chunks.length === 0) {
    return undefined;
  }

  const buffer = Buffer.concat(chunks);
  const contentType = req.headers["content-type"] ?? "";
  if (contentType.includes("application/json")) {
    try {
      return JSON.parse(buffer.toString("utf8"));
    } catch {
      throw new Error("Invalid JSON body");
    }
  }

  return buffer;
}

function handleRouteError(res: ServerResponse, error: unknown): void {
  console.error("route error", error);
  if (res.writableEnded) {
    return;
  }

  res.statusCode = 500;
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.end(JSON.stringify({ error: "internal_error" }));
}

function sendNotFound(res: ServerResponse): void {
  res.statusCode = 404;
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.end(JSON.stringify({ error: "not_found" }));
}
