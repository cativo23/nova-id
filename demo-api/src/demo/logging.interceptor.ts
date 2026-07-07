import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from "@nestjs/common";
import { Observable } from "rxjs";
import { tap } from "rxjs/operators";
import { Logger } from "@nestjs/common";
import { LOG_ACCESS_KEY } from "./log-access.decorator";
import { Reflector } from "@nestjs/core";
import { LogsService } from "./logs/logs.service";

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);

  constructor(
    private reflector: Reflector,
    private logsService: LogsService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url, headers } = request;
    const shouldLog = this.reflector.getAllAndOverride<boolean>(
      LOG_ACCESS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!shouldLog) {
      return next.handle();
    }

    const startTime = Date.now();
    const frontendSource = this.extractFrontendSource(headers, request);
    // Never fall back to X-User-* headers — they are spoofable (M-2).
    // When request.user is absent (unauthenticated / Public decorator), use 'anonymous'.
    const userId = request.user?.userId ?? "anonymous";
    const userRole = request.user?.role ?? "anonymous";
    const authMethod = request.user?.authMethod || "session";
    const clientId = request.user?.clientId || null;

    return next.handle().pipe(
      tap({
        next: (data) => {
          const duration = Date.now() - startTime;
          const logEntry = {
            timestamp: new Date().toISOString(),
            method,
            url,
            statusCode: 200,
            duration: `${duration}ms`,
            frontendSource,
            authMethod,
            clientId,
            user: {
              id: userId,
              role: userRole,
            },
            responseSize: this.safeLength(data),
          };

          // Log to console
          this.logger.log(
            `[${frontendSource}] ${method} ${url} - ${duration}ms - User: ${userId} (${userRole})`,
          );

          // Save to database/file
          this.logsService.logAccess(logEntry);
        },
        error: (error) => {
          const duration = Date.now() - startTime;
          const logEntry = {
            timestamp: new Date().toISOString(),
            method,
            url,
            statusCode: error.status || 500,
            duration: `${duration}ms`,
            frontendSource,
            authMethod,
            clientId,
            user: {
              id: userId,
              role: userRole,
            },
            error: error.message,
          };

          this.logger.error(
            `[${frontendSource}] ${method} ${url} - ${duration}ms - Error: ${error.message} - User: ${userId} (${userRole})`,
          );

          this.logsService.logAccess(logEntry);
        },
      }),
    );
  }

  /**
   * JSON.stringify(data).length throws when data is undefined (e.g. a
   * 204/void handler) and returns undefined for non-serializable values
   * (functions, symbols) — either would crash the response-success log
   * path (#107). Guard both cases and fall back to 0.
   */
  private safeLength(data: unknown): number {
    if (data === undefined) {
      return 0;
    }
    try {
      return JSON.stringify(data)?.length ?? 0;
    } catch {
      return 0;
    }
  }

  private extractFrontendSource(headers: any, request: any): string {
    // Try X-Frontend-Source header first
    if (headers["x-frontend-source"]) {
      return headers["x-frontend-source"];
    }

    // For OAuth2 tokens, check if client ID is available
    if (request.user?.clientId) {
      return `oauth2-client:${request.user.clientId}`;
    }

    // Extract from Referer header
    const referer = headers["referer"] || headers["referrer"] || "";
    if (referer.includes("/auth/")) {
      return "frontend-auth";
    }
    if (referer.includes("/admin/")) {
      return "frontend-admin";
    }
    if (referer.includes("/app/")) {
      return "frontend-app";
    }

    return "unknown";
  }
}
