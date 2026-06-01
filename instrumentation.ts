// Next.js instrumentation hook — loads the Sentry server/edge config.
// Runs on the server only; the init inside is DSN-gated, so this is a no-op
// until SENTRY_DSN is provided.
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}
