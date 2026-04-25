import winston from "winston";
import DailyRotateFile from "winston-daily-rotate-file";
import path from "path";

const { combine, timestamp, printf, colorize, errors, json } = winston.format;

/**
 * Why a custom logger instead of console.log?
 * 1. Log levels (error, warn, info, debug) — filter in prod
 * 2. Structured JSON logs in production — easy to parse with ELK/Datadog
 * 3. Auto-rotating files — prevents disk overflow
 * 4. Stack traces on errors out of the box
 */

// Pretty format for development terminal
const devFormat = combine(
  colorize({ all: true }),
  timestamp({ format: "HH:mm:ss" }),
  errors({ stack: true }),
  printf(({ level, message, timestamp, stack, ...meta }) => {
    const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : "";
    return `${timestamp} [${level}]: ${stack || message}${metaStr}`;
  })
);

// Structured JSON for production (ELK, Datadog, CloudWatch friendly)
const prodFormat = combine(
  timestamp(),
  errors({ stack: true }),
  json()
);

// Rotating file transport — new file each day, keep 14 days
const fileTransport = (level: string) =>
  new DailyRotateFile({
    filename: path.join("logs", `${level}-%DATE%.log`),
    datePattern: "YYYY-MM-DD",
    level,
    maxFiles: "14d",       // auto-delete logs older than 14 days
    maxSize: "20m",        // rotate if file exceeds 20MB
    zippedArchive: true,   // gzip old files to save space
    format: prodFormat,
  });

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || (process.env.NODE_ENV === "production" ? "info" : "debug"),
  transports: [
    // Always write to console
    new winston.transports.Console({
      format: process.env.NODE_ENV === "production" ? prodFormat : devFormat,
    }),
    // File transports (production useful, harmless in dev)
    fileTransport("error"),  // only errors
    fileTransport("info"),   // info + above
  ],
});

export default logger;
