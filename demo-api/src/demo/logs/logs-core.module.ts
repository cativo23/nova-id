import { Module } from "@nestjs/common";
import { LogsService } from "./logs.service";

/**
 * LogsCoreModule — the SOLE provider of LogsService in the app.
 *
 * Extracted from LogsModule so it can be imported by RolesModule without
 * pulling in LogsModule's own dependency on RolesModule (which previously
 * caused a circular dependency: LogsModule -> RolesModule -> LogsModule).
 *
 * LogsService has no injected dependencies, so this module has none either —
 * it is safe for any module (including RolesModule) to import directly.
 *
 * Every module that needs LogsService (or LoggingInterceptor, which depends
 * on it) MUST import this module rather than re-declaring LogsService as a
 * local provider. A duplicate `providers: [LogsService]` elsewhere creates a
 * SEPARATE instance with its own in-memory accessLogs array (see #103).
 */
@Module({
  providers: [LogsService],
  exports: [LogsService],
})
export class LogsCoreModule {}
