import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { RolesController } from "./roles.controller";
import { RolesService } from "./roles.service";
import { UserRole } from "./entities/user-role.entity";
import { DemoAuditService } from "../audit/demo-audit.service";
import { DemoMembershipAudit } from "../audit/demo-membership-audit.entity";
import { LoggingInterceptor } from "../logging.interceptor";
import { LogsService } from "../logs/logs.service";

@Module({
  imports: [
    // Connection name 'demo' is required — UserRole lives on the named 'demo'
    // Postgres connection, not the unnamed default. Without the name the DI
    // container cannot resolve the repository at boot (TypeORM footgun).
    TypeOrmModule.forFeature([UserRole, DemoMembershipAudit], "demo"),
  ],
  controllers: [RolesController],
  providers: [
    RolesService,
    DemoAuditService,
    // LoggingInterceptor + LogsService are registered here (not imported via LogsModule
    // to avoid a circular dependency: LogsModule → RolesModule → LogsModule).
    // LogsService has no injected dependencies, so it resolves cleanly here.
    //
    // FRAGILE: LogsService is registered directly (not via LogsModule) as a
    // circular-dependency workaround. If LogsService ever gains a NestJS-injected
    // constructor dependency, this duplicate-provider shortcut will break at boot
    // (the dependency won't be resolvable in RolesModule's DI scope). At that point,
    // extract a shared LogsSharedModule or use forwardRef() instead of this pattern.
    LogsService,
    LoggingInterceptor,
  ],
  exports: [RolesService, DemoAuditService],
})
export class RolesModule {}
