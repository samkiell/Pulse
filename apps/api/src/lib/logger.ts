export type LogLevel = "debug" | "info" | "warn" | "error";

export function log(level: LogLevel, msg: string, fields?: Record<string, any>): void {
  const entry = {
    level,
    ts: new Date().toISOString(),
    msg,
    ...fields,
  };
  const line = JSON.stringify(entry);
  if (level === "error") {
    process.stderr.write(line + "\n");
  } else {
    process.stdout.write(line + "\n");
  }
}

export const logger = {
  debug: (msg: string, fields?: Record<string, any>) => log("debug", msg, fields),
  info: (msg: string, fields?: Record<string, any>) => log("info", msg, fields),
  warn: (msg: string, fields?: Record<string, any>) => log("warn", msg, fields),
  error: (msg: string, fields?: Record<string, any>) => log("error", msg, fields),
};
