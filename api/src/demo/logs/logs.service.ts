import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as fsPromises from 'fs/promises';
import * as path from 'path';

/** Max file size before rotation (5 MiB). */
const MAX_LOG_BYTES = 5 * 1024 * 1024;

export interface AccessLogEntry {
  timestamp: string;
  method: string;
  url: string;
  statusCode: number;
  duration: string;
  frontendSource: string;
  authMethod?: string;
  clientId?: string;
  user: {
    id: string;
    email: string;
    role: string;
  };
  responseSize?: number;
  error?: string;
}

@Injectable()
export class LogsService {
  private readonly logger = new Logger(LogsService.name);
  private readonly logsDir = path.join(process.cwd(), 'logs');
  private readonly accessLogFile = path.join(this.logsDir, 'access.log');
  private accessLogs: AccessLogEntry[] = [];

  constructor() {
    // Ensure logs directory exists
    if (!fs.existsSync(this.logsDir)) {
      fs.mkdirSync(this.logsDir, { recursive: true });
    }

    // Load existing logs on startup (for in-memory storage)
    this.loadLogs();
  }

  logAccess(entry: AccessLogEntry): void {
    // Add to in-memory array
    this.accessLogs.push(entry);

    // Keep only last 1000 entries in memory
    if (this.accessLogs.length > 1000) {
      this.accessLogs = this.accessLogs.slice(-1000);
    }

    // Fire-and-forget async write so the event loop is never blocked (M-4).
    const logLine = JSON.stringify(entry) + '\n';
    this.writeLogLine(logLine).catch((err: Error) => {
      this.logger.error(`Failed to write access log: ${err.message}`);
    });
  }

  /**
   * Async file write with size-cap rotation.
   *
   * Before appending, stat the file; if it exceeds MAX_LOG_BYTES rotate it
   * (rename access.log → access.log.1, start fresh).  This keeps the file
   * permanently bounded without requiring an external log-rotation daemon.
   */
  private async writeLogLine(line: string): Promise<void> {
    try {
      // Check current file size; rotate if over the cap.
      try {
        const stat = await fsPromises.stat(this.accessLogFile);
        if (stat.size >= MAX_LOG_BYTES) {
          const rotatedPath = `${this.accessLogFile}.1`;
          await fsPromises.rename(this.accessLogFile, rotatedPath);
        }
      } catch {
        // File doesn't exist yet — no rotation needed.
      }

      await fsPromises.appendFile(this.accessLogFile, line, 'utf8');
    } catch (err) {
      throw err; // Re-throw so the caller's .catch() handles it.
    }
  }

  getAccessLogs(limit: number = 100): AccessLogEntry[] {
    return this.accessLogs.slice(-limit).reverse();
  }

  getAccessLogsFiltered(
    limit: number = 100,
    filters?: { method?: string; status?: string; path?: string; frontend?: string },
  ): AccessLogEntry[] {
    let list = [...this.accessLogs];
    if (filters?.method) {
      list = list.filter((log) => log.method === filters.method);
    }
    if (filters?.status) {
      const status = filters.status;
      if (status === '2xx') {
        list = list.filter((log) => log.statusCode >= 200 && log.statusCode < 300);
      } else if (status === '4xx') {
        list = list.filter((log) => log.statusCode >= 400 && log.statusCode < 500);
      } else if (status === '5xx') {
        list = list.filter((log) => log.statusCode >= 500);
      } else {
        list = list.filter((log) => log.statusCode.toString() === status);
      }
    }
    if (filters?.path) {
      const path = filters.path.toLowerCase();
      list = list.filter((log) => log.url?.toLowerCase().includes(path));
    }
    if (filters?.frontend) {
      list = list.filter((log) => log.frontendSource === filters.frontend);
    }
    return list.slice(-limit).reverse();
  }

  getAccessLogsByFrontend(frontendSource: string, limit: number = 100): AccessLogEntry[] {
    return this.accessLogs
      .filter((log) => log.frontendSource === frontendSource)
      .slice(-limit)
      .reverse();
  }

  getAccessLogsByUser(userId: string, limit: number = 100): AccessLogEntry[] {
    return this.accessLogs
      .filter((log) => log.user.id === userId)
      .slice(-limit)
      .reverse();
  }

  getAccessStats(): {
    totalRequests: number;
    byFrontend: Record<string, number>;
    byMethod: Record<string, number>;
    byStatus: Record<string, number>;
  } {
    const stats = {
      totalRequests: this.accessLogs.length,
      byFrontend: {} as Record<string, number>,
      byMethod: {} as Record<string, number>,
      byStatus: {} as Record<string, number>,
    };

    this.accessLogs.forEach((log) => {
      stats.byFrontend[log.frontendSource] = (stats.byFrontend[log.frontendSource] || 0) + 1;
      stats.byMethod[log.method] = (stats.byMethod[log.method] || 0) + 1;
      stats.byStatus[log.statusCode.toString()] = (stats.byStatus[log.statusCode.toString()] || 0) + 1;
    });

    return stats;
  }

  private loadLogs(): void {
    if (fs.existsSync(this.accessLogFile)) {
      try {
        const fileContent = fs.readFileSync(this.accessLogFile, 'utf8');
        const lines = fileContent.trim().split('\n').filter((line) => line);
        this.accessLogs = lines
          .map((line) => {
            try {
              return JSON.parse(line) as AccessLogEntry;
            } catch {
              return null;
            }
          })
          .filter((entry): entry is AccessLogEntry => entry !== null)
          .slice(-1000); // Keep only last 1000 entries
      } catch (error) {
        this.logger.warn('Failed to load existing logs', error);
      }
    }
  }
}
