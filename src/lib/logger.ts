/**
 * Structured JSON logger.
 *
 * Emits one JSON object per line. Log aggregators (Datadog, Axiom,
 * Grafana Loki, Sentry) parse this natively — no regex in dashboards.
 *
 * Keep the surface tiny: log(level, msg, attrs). Always include `level`,
 * `msg`, `ts`. Extra attrs from a child logger are merged.
 *
 * We DO NOT log secrets. Every caller is responsible for stripping
 * passwordHash, session tokens, private keys, and raw request bodies
 * before passing attrs. There's no automatic redaction because a "safe"
 * filter is always wrong somewhere — explicit is safer than clever.
 */

type LogLevel = "debug" | "info" | "warn" | "error";

type Attrs = Record<string, unknown>;

function emit(level: LogLevel, msg: string, attrs?: Attrs): void {
  // In production, stdout is picked up by Docker / systemd and shipped
  // to a log aggregator. In dev, printing JSON is still readable if you
  // pipe through `| jq`.
  const line = JSON.stringify({
    level,
    msg,
    ts: new Date().toISOString(),
    ...(attrs ?? {}),
  });
  if (level === "error") {
    console.error(line);
  } else if (level === "warn") {
    console.warn(line);
  } else {
    console.log(line);
  }
}

export interface Logger {
  debug(msg: string, attrs?: Attrs): void;
  info(msg: string, attrs?: Attrs): void;
  warn(msg: string, attrs?: Attrs): void;
  error(msg: string, attrs?: Attrs): void;
  child(extra: Attrs): Logger;
}

function makeLogger(context: Attrs): Logger {
  const merged = (attrs?: Attrs) => ({ ...context, ...(attrs ?? {}) });
  return {
    debug: (msg, attrs) => emit("debug", msg, merged(attrs)),
    info: (msg, attrs) => emit("info", msg, merged(attrs)),
    warn: (msg, attrs) => emit("warn", msg, merged(attrs)),
    error: (msg, attrs) => emit("error", msg, merged(attrs)),
    child: (extra) => makeLogger({ ...context, ...extra }),
  };
}

export const logger: Logger = makeLogger({ service: "nexora" });

/**
 * Generate a request id for cross-cutting correlation. Logs, error
 * responses, and traces all reference the same id — so "user reports
 * error, ref: 7a4c..." maps 1:1 to a log line.
 */
export function newRequestId(): string {
  return crypto.randomUUID();
}
