import { URL } from "node:url";

import { RouteHandler } from "./types.js";

export const googleDriveWebhookHandler: RouteHandler = async ({
  req,
  res,
  config,
  services,
  body,
}) => {
  const verificationSecret = config.googleDrive.webhookVerificationSecret;
  const providedToken = req.headers["x-goog-channel-token"];
  if (verificationSecret && providedToken !== verificationSecret) {
    res.statusCode = 401;
    res.setHeader("content-type", "application/json; charset=utf-8");
    res.end(JSON.stringify({ error: "invalid_token" }));
    return;
  }

  const fileId = extractFileId(body, req.headers["x-goog-resource-uri"]);
  if (!fileId) {
    res.statusCode = 400;
    res.setHeader("content-type", "application/json; charset=utf-8");
    res.end(JSON.stringify({ error: "missing_file_id" }));
    return;
  }

  await services.ingestion.enqueue({
    fileId,
    resourceId: headerValue(req.headers["x-goog-resource-id"]),
    resourceState: headerValue(req.headers["x-goog-resource-state"]),
    messageNumber: headerValue(req.headers["x-goog-message-number"]),
    historyId: headerValue(req.headers["x-goog-changed"]),
  });

  res.statusCode = 202;
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.end(JSON.stringify({ accepted: true, fileId }));
};

function extractFileId(
  body: unknown,
  resourceUriHeader: string | string[] | undefined
): string | undefined {
  const candidate = normalizeBody(body);
  if (candidate) {
    const fromBody = candidate.fileId ?? candidate.id ?? candidate.resourceId;
    if (typeof fromBody === "string" && fromBody.length > 0) {
      return fromBody;
    }
  }

  if (typeof resourceUriHeader === "string") {
    try {
      const uri = new URL(resourceUriHeader);
      const segments = uri.pathname.split("/").filter(Boolean);
      const lastSegment = segments[segments.length - 1];
      if (lastSegment) {
        return lastSegment;
      }
    } catch {
      // ignore parse errors
    }
  }

  return undefined;
}

function normalizeBody(body: unknown): Record<string, unknown> | undefined {
  if (!body) {
    return undefined;
  }

  if (body instanceof Buffer) {
    try {
      return JSON.parse(body.toString("utf8")) as Record<string, unknown>;
    } catch {
      return undefined;
    }
  }

  if (typeof body === "object") {
    return body as Record<string, unknown>;
  }

  if (typeof body === "string") {
    try {
      return JSON.parse(body) as Record<string, unknown>;
    } catch {
      return undefined;
    }
  }

  return undefined;
}

function headerValue(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}
