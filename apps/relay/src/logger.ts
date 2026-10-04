export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

/** Structured metadata attached to a log line. */
export type LogMeta = Record<string, unknown>;

export class Logger {
  private level: LogLevel;

  constructor() {
    const envLevel = (process.env.LOG_LEVEL || 'info').toUpperCase();
    this.level = LogLevel[envLevel as keyof typeof LogLevel] ?? LogLevel.INFO;
  }

  private format(
    levelStr: string,
    context: string,
    message: string,
    meta?: LogMeta,
  ): string {
    const ts = new Date().toISOString();
    let log = `[${ts}] ${levelStr} [${context}] ${message}`;
    if (meta && Object.keys(meta).length > 0) {
      const metaStr = Object.entries(meta)
        .map(([k, v]) => `${k}=${formatValue(v)}`)
        .join(' ');
      log += ` ${metaStr}`;
    }
    return log;
  }

  debug(context: string, message: string, meta?: LogMeta) {
    if (this.level <= LogLevel.DEBUG) {
      console.debug(this.format('DEBUG', context, message, meta));
    }
  }

  info(context: string, message: string, meta?: LogMeta) {
    if (this.level <= LogLevel.INFO) {
      console.info(this.format('INFO', context, message, meta));
    }
  }

  warn(context: string, message: string, meta?: LogMeta) {
    if (this.level <= LogLevel.WARN) {
      console.warn(this.format('WARN', context, message, meta));
    }
  }

  error(context: string, message: string, meta?: LogMeta) {
    if (this.level <= LogLevel.ERROR) {
      console.error(this.format('ERROR', context, message, meta));
    }
  }
}

/**
 * Renders a metadata value for single-line log output.
 *
 * The previous implementation interpolated values directly, so an object became
 * "[object Object]" and a device id or org id could not be recovered from the
 * log - which defeats the purpose of logging during a tenant-isolation
 * investigation (§146, §231).
 */
function formatValue(value: unknown): string {
  if (value === null || value === undefined) return String(value);
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (value instanceof Error) return value.message;
  try {
    return JSON.stringify(value) ?? String(value);
  } catch {
    return String(value);
  }
}

export const logger = new Logger();