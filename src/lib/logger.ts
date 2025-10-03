/**
 * 構造化ロギングシステム
 * 本番環境とデバッグ環境でログの出力を適切に制御します
 */

type LogLevel = "debug" | "info" | "warn" | "error";

interface LogContext {
  [key: string]: unknown;
}

class Logger {
  private isDevelopment: boolean;
  private isProduction: boolean;

  constructor() {
    this.isDevelopment = process.env.NODE_ENV === "development";
    this.isProduction = process.env.NODE_ENV === "production";
  }

  private log(level: LogLevel, message: string, context?: LogContext): void {
    // 本番環境ではerrorとwarnのみ出力
    if (this.isProduction && (level === "debug" || level === "info")) {
      return;
    }

    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      message,
      ...context,
    };

    switch (level) {
      case "error":
        // eslint-disable-next-line no-console
        console.error(JSON.stringify(logEntry));
        break;
      case "warn":
        // eslint-disable-next-line no-console
        console.warn(JSON.stringify(logEntry));
        break;
      case "info":
        // eslint-disable-next-line no-console
        console.info(JSON.stringify(logEntry));
        break;
      case "debug":
        // eslint-disable-next-line no-console
        console.debug(JSON.stringify(logEntry));
        break;
    }
  }

  debug(message: string, context?: LogContext): void {
    this.log("debug", message, context);
  }

  info(message: string, context?: LogContext): void {
    this.log("info", message, context);
  }

  warn(message: string, context?: LogContext): void {
    this.log("warn", message, context);
  }

  error(message: string, context?: LogContext): void {
    this.log("error", message, context);
  }
}

export const logger = new Logger();
