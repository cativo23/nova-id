import { Module } from "@nestjs/common";
import { LogsController } from "./logs.controller";
import { RolesModule } from "../roles/roles.module";
import { LogsCoreModule } from "./logs-core.module";

/**
 * LogsModule — access logs storage and retrieval.
 *
 * RolesModule is imported so AppAdminGuard (which depends on RolesService)
 * can be resolved when applied to LogsController.
 *
 * LogsService itself lives in LogsCoreModule (not declared here) so that
 * RolesModule can import the SAME LogsService instance without creating a
 * circular dependency (LogsModule -> RolesModule -> LogsModule). See #103.
 * LogsCoreModule is re-exported so other modules that import LogsModule
 * (e.g. DemoModule) keep transitive access to the shared LogsService.
 */
@Module({
  imports: [LogsCoreModule, RolesModule],
  controllers: [LogsController],
  exports: [LogsCoreModule],
})
export class LogsModule {}
