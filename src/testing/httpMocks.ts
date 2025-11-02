import { IncomingMessage, ServerResponse } from "node:http";
import { EventEmitter } from "node:events";

export interface MockResponseState {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
  ended: boolean;
}

export function createMockRequest(headers?: Record<string, string | undefined>): IncomingMessage {
  const request = new EventEmitter() as IncomingMessage;
  request.headers = Object.fromEntries(
    Object.entries(headers ?? {}).map(([key, value]) => [key.toLowerCase(), value])
  );
  request.method = "POST";
  request.url = "/";
  return request;
}

export function createMockResponse(): { response: ServerResponse; state: MockResponseState } {
  const state: MockResponseState = {
    statusCode: 200,
    headers: {},
    body: "",
    ended: false,
  };

  const response = new EventEmitter() as unknown as ServerResponse;

  Object.defineProperty(response, "statusCode", {
    get: () => state.statusCode,
    set: (value: number) => {
      state.statusCode = value;
    },
    enumerable: true,
    configurable: true,
  });

  let writableEnded = false;
  Object.defineProperty(response, "writableEnded", {
    get: () => writableEnded,
    set: (value: boolean) => {
      writableEnded = value;
    },
    enumerable: true,
    configurable: true,
  });

  response.setHeader = ((name: string, value: number | string | readonly string[]) => {
    state.headers[name.toLowerCase()] = Array.isArray(value) ? value.join(",") : String(value);
    return response;
  }) as ServerResponse["setHeader"];

  response.end = ((chunk?: string | Buffer, encoding?: BufferEncoding | (() => void), cb?: () => void) => {
    let payload = chunk;
    let callback = cb;

    if (typeof encoding === "function") {
      callback = encoding;
      payload = undefined;
    }

    if (payload) {
      state.body += payload.toString();
    }

    state.ended = true;
    writableEnded = true;

    if (callback) {
      callback();
    }

    return response;
  }) as ServerResponse["end"];

  return { response, state };
}
