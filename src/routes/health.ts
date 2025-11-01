import { RouteHandler } from "./types.js";

export const healthHandler: RouteHandler = ({ res }) => {
  const payload = JSON.stringify({ status: "ok" });
  res.statusCode = 200;
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.setHeader("content-length", Buffer.byteLength(payload));
  res.end(payload);
};
