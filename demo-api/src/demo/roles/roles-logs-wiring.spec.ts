import { Test } from "@nestjs/testing";
import { getRepositoryToken, getDataSourceToken } from "@nestjs/typeorm";
import { RolesModule } from "./roles.module";
import { LogsModule } from "../logs/logs.module";
import { LogsService } from "../logs/logs.service";
import { LoggingInterceptor } from "../logging.interceptor";
import { UserRole } from "./entities/user-role.entity";
import { DemoMembershipAudit } from "../audit/demo-membership-audit.entity";

/**
 * Regression test for #103.
 *
 * RolesModule used to declare its own private LogsService/LoggingInterceptor
 * providers instead of importing the shared LogsModule, so a /roles/*
 * mutation (bootstrap/grant/revoke) logged into a LogsService instance that
 * GET /logs, /logs/stats, and /logs/user/:id (backed by LogsModule's own
 * LogsService) could never see.
 *
 * This test compiles the real RolesModule + LogsModule together (DB
 * repository tokens stubbed out — no Postgres needed) and proves the DI
 * container now resolves a single shared LogsService instance, and that a
 * write via RolesController's LoggingInterceptor is visible to whatever
 * reads LogsService for GET /logs.
 */
describe("RolesModule + LogsModule share one LogsService instance (#103)", () => {
  it("resolves the identical LogsService instance from both modules", async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [RolesModule, LogsModule],
    })
      .overrideProvider(getRepositoryToken(UserRole, "demo"))
      .useValue({})
      .overrideProvider(getRepositoryToken(DemoMembershipAudit, "demo"))
      .useValue({})
      .overrideProvider(getDataSourceToken("demo"))
      .useValue({})
      .compile();

    const logsService = moduleRef.get(LogsService, { strict: false });
    const interceptor = moduleRef.get(LoggingInterceptor, { strict: false });

    expect((interceptor as any).logsService).toBe(logsService);

    // Simulate a /roles/* mutation logged via the interceptor's LogsService,
    // then prove it is visible through the same LogsService instance that
    // backs GET /logs.
    const entry = {
      timestamp: new Date().toISOString(),
      method: "POST",
      url: "/roles/bootstrap/app-admin",
      statusCode: 200,
      duration: "1ms",
      frontendSource: "frontend-admin",
      user: { id: "actor-u1", email: "actor@nova.test", role: "platform_admin" },
    };
    (interceptor as any).logsService.logAccess(entry);

    expect(logsService.getAccessLogs()).toContainEqual(
      expect.objectContaining({ url: "/roles/bootstrap/app-admin" }),
    );
  });
});
