import { ForbiddenException } from "@nestjs/common";
import { AppAdminGuard } from "./app-admin.guard";

function ctxWith(user: any) {
  return {
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  } as any;
}

describe("AppAdminGuard (demo_app Postgres sole source, ADR-0002)", () => {
  it("ignores a forged user.appRole claim and uses demo_app DB", async () => {
    const rolesService = {
      getAppRole: jest.fn().mockResolvedValue("app_user"),
    };
    const guard = new AppAdminGuard({} as any, rolesService as any);

    // forged claim says app_admin, SQLite says app_user → must DENY
    await expect(
      guard.canActivate(ctxWith({ userId: "u1", appRole: "app_admin" })),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(rolesService.getAppRole).toHaveBeenCalledWith("u1");
  });

  it("allows when SQLite says app_admin", async () => {
    const rolesService = {
      getAppRole: jest.fn().mockResolvedValue("app_admin"),
    };
    const guard = new AppAdminGuard({} as any, rolesService as any);
    await expect(guard.canActivate(ctxWith({ userId: "u1" }))).resolves.toBe(
      true,
    );
  });
});
