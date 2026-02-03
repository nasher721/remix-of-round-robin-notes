type LogLevel = "debug" | "info" | "warn" | "error";

export type LogContext = Record<string, unknown>;

const REQUEST_ID_KEY = "rrn_request_id";

const getRequestId = (): string => {
  if (typeof window === "undefined" || !window.sessionStorage) {
    return "server";
  }

  const existing = window.sessionStorage.getItem(REQUEST_ID_KEY);
  if (existing) return existing;

  const requestId = window.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  window.sessionStorage.setItem(REQUEST_ID_KEY, requestId);
  return requestId;
};

const serializeError = (error: unknown): Record<string, unknown> | undefined => {
  if (!error) return undefined;
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }
  return { error };
};

const log = (level: LogLevel, message: string, context: LogContext = {}): void => {
  const payload = {
    timestamp: new Date().toISOString(),
    level,
    message,
    requestId: getRequestId(),
    ...context,
  };

  const output = JSON.stringify(payload);
  switch (level) {
    case "debug":
      console.debug(output);
      break;
    case "info":
      console.info(output);
      break;
    case "warn":
      console.warn(output);
      break;
    case "error":
      console.error(output);
      break;
    default:
      console.log(output);
  }
};

export const logDebug = (message: string, context?: LogContext): void => {
  log("debug", message, context);
};

export const logInfo = (message: string, context?: LogContext): void => {
  log("info", message, context);
};

export const logWarn = (message: string, context?: LogContext): void => {
  log("warn", message, context);
};

export const logError = (message: string, error?: unknown, context: LogContext = {}): void => {
  log("error", message, { ...context, error: serializeError(error) });
};

export const logMetric = (
  name: string,
  value: number,
  context: LogContext = {}
): void => {
  log("info", "metric", {
    metric: {
      name,
      value,
    },
    ...context,
  });
};
