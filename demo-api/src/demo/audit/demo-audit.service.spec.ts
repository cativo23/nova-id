import { DemoAuditService } from "./demo-audit.service";

/**
 * DemoAuditService failure-propagation spec (#105).
 *
 * record() previously caught and only logged a failed audit insert, then
 * resolved successfully. RolesController awaits record() and returns 200
 * regardless, so a failed demo_membership_audit write left a silent gap:
 * the role mutation applied but no audit trail was created, and the caller
 * had no way to know. record() must now surface the failure so callers
 * (and Nest's exception filter) see it instead of a false-success 200.
 */
describe("DemoAuditService.record — failure propagation (#105)", () => {
  it("rethrows when the audit insert fails", async () => {
    const repo = {
      create: jest.fn((entry) => entry),
      save: jest.fn().mockRejectedValue(new Error("db unavailable")),
    } as any;
    const service = new DemoAuditService(repo);

    await expect(
      service.record({
        actorId: "actor-u1",
        action: "membership.grant",
        appId: "nova-id-test-app",
        targetId: "target-u",
        targetType: "user",
      }),
    ).rejects.toThrow("db unavailable");
  });

  it("resolves normally when the audit insert succeeds", async () => {
    const repo = {
      create: jest.fn((entry) => entry),
      save: jest.fn().mockResolvedValue(undefined),
    } as any;
    const service = new DemoAuditService(repo);

    await expect(
      service.record({
        actorId: "actor-u1",
        action: "membership.grant",
        appId: "nova-id-test-app",
        targetId: "target-u",
        targetType: "user",
      }),
    ).resolves.toBeUndefined();
  });
});
