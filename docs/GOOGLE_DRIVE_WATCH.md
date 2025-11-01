# Google Drive Watch Playbook

This guide walks through creating and maintaining the Google Drive push notifications that feed the ingestion service.

## Prerequisites

- Google Cloud project with the **Drive API** and **Docs API** enabled.
- Service account with delegated access to the target folder and its documents.
- HTTPS endpoint (or Pub/Sub topic) reachable by Google. For local testing, tools like ngrok or Cloudflare Tunnel work but require periodic renewal.

## Service Account Setup

1. In Google Cloud Console, create a service account.
2. Generate a JSON key and store it securely (the value goes into `GOOGLE_SERVICE_ACCOUNT_KEY`).
3. Share the Drive folder and any seed documents with the service account email (`GOOGLE_SERVICE_ACCOUNT_EMAIL`).
4. If your organization enforces domain-wide delegation, add the Drive scopes:
   - `https://www.googleapis.com/auth/drive.readonly`
   - `https://www.googleapis.com/auth/documents.readonly`

## Creating a Direct HTTPS Watch

1. Deploy the ingestion service and expose `POST /webhooks/google-drive` at a public HTTPS URL.
2. Choose a random shared secret, store it in `GOOGLE_DRIVE_WEBHOOK_SECRET`, and configure your gateway to pass the header untouched.
3. Authenticate as the service account (via the JSON key) and issue:

   ```bash
   curl -X POST \
     -H "Authorization: Bearer $(gcloud auth print-access-token --impersonate-service-account=$SERVICE_ACCOUNT)" \
     -H "Content-Type: application/json" \
     "https://www.googleapis.com/drive/v3/files/$FOLDER_ID/watch" \
     -d '{
       "id": "your-channel-id",
       "type": "web_hook",
       "address": "https://your-domain/webhooks/google-drive",
       "token": "shared-secret"
     }'
   ```

4. The response includes `resourceId`, `channelId`, and `expiration`. Persist them so you can renew the watch before expiry and stop it explicitly if needed.

### Renewing the Watch

- Watches expire in ~7 days by default. Set a scheduled job (Cloud Scheduler, cron) to recreate them 24 hours before expiry.
- To stop a channel:
  ```bash
  curl -X POST \
    -H "Authorization: Bearer $ACCESS_TOKEN" \
    -H "Content-Type: application/json" \
    https://www.googleapis.com/drive/v3/channels/stop \
    -d '{"id":"channel-id","resourceId":"resource-id"}'
  ```

## Pub/Sub-Based Delivery

If you prefer not to expose a public endpoint until the API gateway is live:

1. Create a Pub/Sub topic and subscription.
2. Call `files.watch` with:
   ```json
   {
     "id": "channel-id",
     "type": "web_hook",
     "address": "https://pubsub.googleapis.com/projects/PROJECT/topics/TOPIC"
   }
   ```
3. Configure a push subscription from Pub/Sub to your service once it is public, or poll the subscription from a worker that replays messages to `/webhooks/google-drive`.

## Testing Without Live Watches

- Trigger ingestion manually: `curl -X POST http://localhost:8080/webhooks/google-drive -H 'x-goog-channel-token: shared-secret' -d '{"fileId":"doc-id"}'`.
- Disable the secret check for local-only testing by omitting `GOOGLE_DRIVE_WEBHOOK_SECRET` or overriding the environment just for the process.

## Troubleshooting

| Symptom                                 | Likely Cause                 | Fix                                                                            |
| --------------------------------------- | ---------------------------- | ------------------------------------------------------------------------------ |
| 401 from webhook                        | Secret mismatch              | Verify the channel `token` and `GOOGLE_DRIVE_WEBHOOK_SECRET`.                  |
| 404 returned to Drive                   | Wrong URL path               | Ensure the gateway forwards to `/webhooks/google-drive` with identical casing. |
| No notifications                        | Watch expired                | Renew the channel; confirm the new `channelId` and `resourceId`.               |
| `File is not within watch folder` error | File moved outside folder    | Update the watch folder ID or adjust folder permissions.                       |
| Permission denied when fetching doc     | Service account lacks access | Share the document or folder with the service account email.                   |

## Automation Tips

- Keep channel metadata in a lightweight store (Supabase table, Firestore, DynamoDB) with expiration timestamps.
- Implement a cron job that checks for channels expiring in the next 24 hours and renews them automatically.
- Log the `x-goog-message-number` header—gaps indicate dropped notifications; consider re-crawling via the Drive Changes API if gaps appear.
