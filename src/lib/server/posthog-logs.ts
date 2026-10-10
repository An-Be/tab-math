import "server-only";
import { OTLPLogExporter } from "@opentelemetry/exporter-logs-otlp-http";
import { resourceFromAttributes } from "@opentelemetry/resources";
import { BatchLogRecordProcessor, LoggerProvider } from "@opentelemetry/sdk-logs";
import { after } from "next/server";

// Structured server logs to PostHog Logs (OTLP). Off without the env vars.
// Attributes are outcomes and counts only: never receipt contents or tokens.
const token = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN;
const host = process.env.NEXT_PUBLIC_POSTHOG_HOST;
const endpoint = host ? new URL("i/v1/logs", `${host.replace(/\/$/, "")}/`).toString() : null;

const provider =
  token && endpoint
    ? new LoggerProvider({
        resource: resourceFromAttributes({ "service.name": "tabmath" }),
        processors: [
          new BatchLogRecordProcessor({
            exporter: new OTLPLogExporter({
              url: endpoint,
              headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
            }),
          }),
        ],
      })
    : null;

export const posthogLogger = provider?.getLogger("tabmath") ?? null;

/** Flushes buffered log records after the response is sent. */
export function flushPostHogLogs() {
  if (!provider) return;
  after(async () => {
    await provider.forceFlush();
  });
}
