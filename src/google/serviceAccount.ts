import { JWT } from "google-auth-library";
import { google } from "googleapis";

import { AppConfig } from "../utils/config.js";

const DOCS_SCOPE = "https://www.googleapis.com/auth/documents.readonly";
const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive.readonly";

export function createServiceAccountClient(config: AppConfig): JWT {
  const { serviceAccountEmail, serviceAccountKey } = config.googleDrive;
  if (!serviceAccountEmail || !serviceAccountKey) {
    throw new Error("Google service account credentials are not configured");
  }

  const key = parseServiceAccountKey(serviceAccountKey);

  return new google.auth.JWT({
    email: serviceAccountEmail,
    key,
    scopes: [DOCS_SCOPE, DRIVE_SCOPE],
  });
}

function parseServiceAccountKey(value: string): string {
  const trimmed = value.trim();
  if (trimmed.startsWith("-----BEGIN")) {
    return trimmed;
  }

  if (trimmed.startsWith("{")) {
    const parsed = JSON.parse(trimmed) as { private_key?: string };
    if (!parsed.private_key) {
      throw new Error("Service account JSON missing private_key field");
    }
    return parsed.private_key;
  }

  const decoded = Buffer.from(trimmed, "base64").toString("utf8");
  const parsed = JSON.parse(decoded) as { private_key?: string };
  if (!parsed.private_key) {
    throw new Error("Decoded service account JSON missing private_key field");
  }
  return parsed.private_key;
}
