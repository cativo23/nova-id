import "reflect-metadata";
import { ROUTE_ARGS_METADATA } from "@nestjs/common/constants";
import { ParseUUIDPipe } from "@nestjs/common";
import { RolesController } from "./roles.controller";

/**
 * Regression test for #108.
 *
 * @Param('userId') on the mutating role routes bypassed DTO validation
 * entirely — POST /roles/user/not-a-real-id created an orphaned
 * user_roles row surfacing as a phantom app_admin. Every handler taking
 * :userId must run it through ParseUUIDPipe.
 *
 * Inspects Nest's ROUTE_ARGS_METADATA directly (the same metadata Nest's
 * own param-pipe pipeline reads at request time) rather than driving a
 * real HTTP request — this codebase's controller specs are unit-level and
 * don't stand up an HTTP transport.
 */
function paramPipes(methodName: string): unknown[] {
  const meta = Reflect.getMetadata(
    ROUTE_ARGS_METADATA,
    RolesController,
    methodName,
  ) as Record<string, { data?: string; pipes: unknown[] }>;
  const userIdParam = Object.values(meta).find(
    (entry) => entry.data === "userId",
  );
  return userIdParam?.pipes ?? [];
}

describe("RolesController :userId route params use ParseUUIDPipe (#108)", () => {
  it.each([
    "getUserRole",
    "setUserRole",
    "updateUserRole",
    "deleteUserRole",
  ])("%s validates :userId as a UUID", (methodName) => {
    const pipes = paramPipes(methodName);
    expect(
      pipes.some(
        (pipe) => pipe === ParseUUIDPipe || pipe instanceof ParseUUIDPipe,
      ),
    ).toBe(true);
  });
});
