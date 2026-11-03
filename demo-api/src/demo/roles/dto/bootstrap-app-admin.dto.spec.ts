import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { BootstrapAppAdminDto } from "./bootstrap-app-admin.dto";

/**
 * Regression test for #108.
 *
 * BootstrapAppAdminDto.userId only had @IsString(), so
 * POST /roles/bootstrap/app-admin accepted any string as userId — e.g.
 * "not-a-real-id" — creating an orphaned user_roles row that surfaces as a
 * phantom app_admin. userId must be a real Kratos identity UUID.
 */
describe("BootstrapAppAdminDto (#108)", () => {
  it("rejects a non-UUID userId", async () => {
    const dto = plainToInstance(BootstrapAppAdminDto, {
      userId: "not-a-real-id",
    });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].constraints).toHaveProperty("isUuid");
  });

  it("accepts a valid UUID userId", async () => {
    const dto = plainToInstance(BootstrapAppAdminDto, {
      userId: "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it("accepts an omitted userId (optional)", async () => {
    const dto = plainToInstance(BootstrapAppAdminDto, {});
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });
});
