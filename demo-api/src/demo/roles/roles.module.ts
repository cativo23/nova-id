import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { RolesController } from "./roles.controller";
import { RolesService } from "./roles.service";
import { UserRole } from "./entities/user-role.entity";
import { DemoAuditService } from "../audit/demo-audit.service";
import { DemoMembershipAudit } from "../audit/demo-membership-audit.entity";
import { LoggingInterceptor } from "../logging.interceptor";
import { LogsCoreModule } from "../logs/logs-core.module";

@Module({
  imports: [
    // Connection name 'demo' is required — UserRole lives on the named 'demo'
    // Postgres connection, not the unnamed default. Without the name the DI
    // container cannot resolve the repository at boot (TypeORM footgun).
    TypeOrmModule.forFeature([UserRole, DemoMembershipAudit], "demo"),
    // LogsCoreModule (not LogsModule) so LoggingInterceptor resolves the SAME
    // LogsService singleton that LogsController reads from. Importing
    // LogsCoreModule directly (instead of LogsModule) avoids the circular
    // dependency LogsModule -> RolesModule -> LogsModule, since LogsCoreModule
    // has no dependency on RolesModule. See #103 — a previous private
    // duplicate LogsService provider here caused /roles/* mutations to log
    // into an instance invisible to GET /logs.
    LogsCoreModule,
  ],
  controllers: [RolesController],
  providers: [
    RolesService,
    DemoAuditService,
    LoggingInterceptor,
  ],
  exports: [RolesService, DemoAuditService],
})
export class RolesModule {}
