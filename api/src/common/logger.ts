import { WinstonModule } from 'nest-winston';
import * as winston from 'winston';
import * as fs from 'fs';
import * as path from 'path';

// Ensure logs directory exists
const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Bound file transports so a busy/misbehaving process can't fill the disk:
// 10MB per file, 5 rotated files kept (50MB ceiling per transport).
const LOG_FILE_MAX_SIZE_BYTES = 10 * 1024 * 1024;
const LOG_FILE_MAX_FILES = 5;

const REDACTED = '[REDACTED]';
// Matches PHI/secret-shaped field names regardless of case or key style
// (camelCase, snake_case) — see healthcare-data / security-first handling
// rules: never log passwords, tokens, or patient-identifying data.
const SENSITIVE_KEY_PATTERN = /password|token|secret|ssn|dob|national_id|patient_name/i;

/**
 * Recursively mask values whose key looks like a secret or PHI field.
 * Exported for unit testing; also used directly by the winston redaction
 * format below.
 */
export function redactSensitiveFields(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => redactSensitiveFields(item));
  }
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      out[key] = SENSITIVE_KEY_PATTERN.test(key) ? REDACTED : redactSensitiveFields(val);
    }
    return out;
  }
  return value;
}

// Mutates `info` in place (winston convention) rather than returning a new
// object, so Symbol-keyed internals (level/message/splat) survive.
const redactFormat = winston.format((info) => {
  for (const key of Object.keys(info)) {
    if (key === 'level' || key === 'message') continue;
    const value = (info as Record<string, unknown>)[key];
    (info as Record<string, unknown>)[key] = SENSITIVE_KEY_PATTERN.test(key)
      ? REDACTED
      : redactSensitiveFields(value);
  }
  return info;
});

export const WinstonLogger = WinstonModule.createLogger({
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.timestamp(),
        redactFormat(),
        winston.format.colorize(),
        winston.format.printf(({ timestamp, level, message, context, ...meta }) => {
          return `${timestamp} [${context || 'Application'}] ${level}: ${message} ${Object.keys(meta).length ? JSON.stringify(meta, null, 2) : ''
            }`;
        }),
      ),
    }),
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
      maxsize: LOG_FILE_MAX_SIZE_BYTES,
      maxFiles: LOG_FILE_MAX_FILES,
      format: winston.format.combine(
        winston.format.timestamp(),
        redactFormat(),
        winston.format.json(),
      ),
    }),
    new winston.transports.File({
      filename: path.join(logsDir, 'combined.log'),
      maxsize: LOG_FILE_MAX_SIZE_BYTES,
      maxFiles: LOG_FILE_MAX_FILES,
      format: winston.format.combine(
        winston.format.timestamp(),
        redactFormat(),
        winston.format.json(),
      ),
    }),
  ],
});
