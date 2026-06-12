import Telemetry from "@/models/Telemetry";
import mongoose from "mongoose";

/**
 * Standard log levels for the Syntra Core OS environment.
 */
export type LogLevel = "info" | "warn" | "error" | "debug";

/**
 * Production-ready utility logger that outputs formatted console logs
 * and automatically logs errors and warning audits asynchronously to the Telemetry collection.
 */
export class Logger {
  private static formatMessage(level: LogLevel, message: string): string {
    const timestamp = new Date().toISOString();
    const upperLevel = level.toUpperCase().padEnd(5);
    return `[${timestamp}] [${upperLevel}] ${message}`;
  }

  /**
   * Log standard informational logs.
   */
  public static info(message: string, metadata: Record<string, any> = {}) {
    console.log(this.formatMessage("info", message), Object.keys(metadata).length ? metadata : "");
  }

  /**
   * Log system warnings and asynchronously persist a Telemetry record.
   */
  public static warn(message: string, metadata: Record<string, any> = {}, userId?: string) {
    console.warn(this.formatMessage("warn", message), Object.keys(metadata).length ? metadata : "");
    
    this.recordTelemetry("warning", message, metadata, userId).catch(err => {
      console.error("[CRITICAL] Failed to persist warning telemetry:", err.message);
    });
  }

  /**
   * Log critical system errors, attach stack traces, and asynchronously write an audit record to Telemetry.
   */
  public static error(message: string, error?: Error | any, metadata: Record<string, any> = {}, userId?: string) {
    const errDetails = error instanceof Error ? { name: error.name, message: error.message, stack: error.stack } : error;
    const combinedMeta = { ...metadata, ...(errDetails ? { error: errDetails } : {}) };
    
    console.error(this.formatMessage("error", message), combinedMeta);

    this.recordTelemetry("error", message, combinedMeta, userId).catch(err => {
      console.error("[CRITICAL] Failed to persist error telemetry:", err.message);
    });
  }

  /**
   * Log granular debug logs (omitted in production build environments).
   */
  public static debug(message: string, metadata: Record<string, any> = {}) {
    if (process.env.NODE_ENV !== "production") {
      console.debug(this.formatMessage("debug", message), Object.keys(metadata).length ? metadata : "");
    }
  }

  /**
   * Log business metrics and performance telemetry (e.g., Latency, AI Token usage).
   * Automatically persists to the Telemetry database.
   */
  public static metric(action: string, category: string, metadata: Record<string, any> = {}, userId?: string) {
    const timestamp = new Date().toISOString();
    
    // Cyan color for terminal metrics so they stand out from standard info logs
    console.log(`\x1b[36m[${timestamp}] [METRIC] [${action}]\x1b[0m`, Object.keys(metadata).length ? metadata : "");

    this.recordTelemetry(action, `Metric recorded: ${action}`, metadata, userId, category).catch(err => {
      console.error("[CRITICAL] Failed to persist metric telemetry:", err.message);
    });
  }

  /**
   * Safe helper to write system events to the Telemetry database collection.
   */
  private static async recordTelemetry(
    level: string, 
    message: string, 
    metadata: Record<string, any>, 
    userId?: string,
    category: string = "system"
  ) {
    try {
      // Bypass write if Mongoose connection is not active or established
      if (mongoose.connection.readyState !== 1) {
        return;
      }
      
      await Telemetry.create({
        userId: userId ? new mongoose.Types.ObjectId(userId) : undefined,
        action: category === "system" ? `system_${level}` : level,
        category,
        metadata: {
          message,
          ...metadata
        }
      });
    } catch (err: any) {
      console.error("[CRITICAL] Telemetry write failed:", err.message);
    }
  }
}
