type LogLevel = "info" | "warn" | "error" | "debug";

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: string;
  data?: Record<string, unknown>;
  error?: {
    message: string;
    stack?: string;
  };
}

function formatLog(entry: LogEntry): string {
  const { level, message, timestamp, context, data, error } = entry;
  const prefix = context ? `[${context}]` : "";
  const dataStr = data ? ` ${JSON.stringify(data)}` : "";
  const errorStr = error ? ` | Error: ${error.message}` : "";
  return `${timestamp} ${level.toUpperCase()} ${prefix} ${message}${dataStr}${errorStr}`;
}

function createLogEntry(
  level: LogLevel,
  message: string,
  context?: string,
  data?: Record<string, unknown>,
  err?: unknown
): LogEntry {
  const entry: LogEntry = {
    level,
    message,
    timestamp: new Date().toISOString(),
    context,
    data,
  };

  if (err instanceof Error) {
    entry.error = {
      message: err.message,
      stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
    };
  }

  return entry;
}

class Logger {
  private context?: string;

  constructor(context?: string) {
    this.context = context;
  }

  child(context: string): Logger {
    return new Logger(this.context ? `${this.context}:${context}` : context);
  }

  info(message: string, data?: Record<string, unknown>) {
    const entry = createLogEntry("info", message, this.context, data);
    if (process.env.NODE_ENV === "production") {
      console.log(JSON.stringify(entry));
    } else {
      console.log(formatLog(entry));
    }
  }

  warn(message: string, data?: Record<string, unknown>) {
    const entry = createLogEntry("warn", message, this.context, data);
    if (process.env.NODE_ENV === "production") {
      console.warn(JSON.stringify(entry));
    } else {
      console.warn(formatLog(entry));
    }
  }

  error(message: string, err?: unknown, data?: Record<string, unknown>) {
    const entry = createLogEntry("error", message, this.context, data, err);
    if (process.env.NODE_ENV === "production") {
      console.error(JSON.stringify(entry));
    } else {
      console.error(formatLog(entry));
      if (err instanceof Error && err.stack) {
        console.error(err.stack);
      }
    }
  }

  debug(message: string, data?: Record<string, unknown>) {
    if (process.env.NODE_ENV !== "development") return;
    const entry = createLogEntry("debug", message, this.context, data);
    console.debug(formatLog(entry));
  }
}

export const logger = new Logger();
export function createLogger(context: string): Logger {
  return new Logger(context);
}
