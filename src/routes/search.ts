import { RouteHandler } from "./types.js";

interface SearchRequestBody {
  query?: string;
  limit?: number;
}

const DEFAULT_LIMIT = 5;

export const searchHandler: RouteHandler = async ({ res, body, services }) => {
  const payload = normalizeBody(body);
  if (!payload.query) {
    res.statusCode = 400;
    res.setHeader("content-type", "application/json; charset=utf-8");
    res.end(JSON.stringify({ error: "missing_query" }));
    return;
  }

  const limit =
    Number.isFinite(payload.limit) && payload.limit !== undefined
      ? Math.max(1, payload.limit)
      : DEFAULT_LIMIT;

  const [queryVector] = await services.embeddings.embedText([payload.query]);
  if (!queryVector) {
    res.statusCode = 500;
    res.setHeader("content-type", "application/json; charset=utf-8");
    res.end(JSON.stringify({ error: "embedding_failure" }));
    return;
  }

  const results = await services.vectorStore.queryByVector(queryVector, { limit });

  res.statusCode = 200;
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.end(JSON.stringify({ results }));
};

function normalizeBody(body: unknown): SearchRequestBody {
  if (!body) {
    return {};
  }

  if (typeof body === "object") {
    return body as SearchRequestBody;
  }

  if (typeof body === "string") {
    try {
      return JSON.parse(body) as SearchRequestBody;
    } catch {
      return {};
    }
  }

  return {};
}
