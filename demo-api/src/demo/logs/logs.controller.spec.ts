import { LogsController } from "./logs.controller";

/**
 * Logs controller spec (ADR-0002 / ADR-0003, strict layering).
 *
 * Access gate is now enforced by AppAdminGuard (class-level @UseGuards),
 * which is separately exercised in app-admin.guard.spec.ts.  These tests
 * cover the controller's routing and delegation logic assuming the guard
 * has already admitted the caller.
 *
 * Authorization behaviour:
 *   - The SOLE gate is app role app_admin from SQLite (ADR-0002).
 *   - platform_admin does NOT grant access (ADR-0003, strict layering).
 * Both rules are enforced inside AppAdminGuard — see its spec for the
 * full coverage matrix.
 */

function makeController() {
  const logsService = {
    getAccessLogs: jest.fn().mockReturnValue([{ url: "/test" }]),
    getAccessLogsFiltered: jest.fn().mockReturnValue([{ url: "/filtered" }]),
    getAccessStats: jest.fn().mockReturnValue({ totalRequests: 42 }),
    getAccessLogsByFrontend: jest.fn().mockReturnValue([{ url: "/fe" }]),
    getAccessLogsByUser: jest.fn().mockReturnValue([{ url: "/user" }]),
  } as any;

  return { controller: new LogsController(logsService), logsService };
}

describe("LogsController routing (access gate = AppAdminGuard)", () => {
  describe("getLogs", () => {
    it("delegates to getAccessLogs when no filters are supplied", async () => {
      const { controller, logsService } = makeController();
      const result = await controller.getLogs();
      expect(logsService.getAccessLogs).toHaveBeenCalledWith(100);
      expect(result).toEqual([{ url: "/test" }]);
    });

    it("delegates to getAccessLogsFiltered when a filter is provided", async () => {
      const { controller, logsService } = makeController();
      const result = await controller.getLogs(undefined, undefined, "GET");
      expect(logsService.getAccessLogsFiltered).toHaveBeenCalledWith(
        100,
        expect.objectContaining({ method: "GET" }),
      );
      expect(result).toEqual([{ url: "/filtered" }]);
    });

    it("respects limit query param", async () => {
      const { controller, logsService } = makeController();
      await controller.getLogs("25");
      expect(logsService.getAccessLogs).toHaveBeenCalledWith(25);
    });
  });

  describe("getStats", () => {
    it("returns stats from service", async () => {
      const { controller } = makeController();
      const result = await controller.getStats();
      expect(result).toEqual({ totalRequests: 42 });
    });
  });

  describe("getLogsByFrontend", () => {
    it("delegates to service with frontend and limit", async () => {
      const { controller, logsService } = makeController();
      await controller.getLogsByFrontend("frontend-app", "50");
      expect(logsService.getAccessLogsByFrontend).toHaveBeenCalledWith(
        "frontend-app",
        50,
      );
    });
  });

  describe("getLogsByUser", () => {
    it("delegates to service with userId and limit", async () => {
      const { controller, logsService } = makeController();
      await controller.getLogsByUser("user-uid", "10");
      expect(logsService.getAccessLogsByUser).toHaveBeenCalledWith(
        "user-uid",
        10,
      );
    });
  });
});
