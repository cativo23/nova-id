import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsUUID } from "class-validator";

/**
 * Body for POST /roles/bootstrap/app-admin.
 *
 * When `userId` is omitted, the endpoint promotes the requesting platform_admin.
 */
export class BootstrapAppAdminDto {
  @ApiPropertyOptional({
    description:
      "Kratos identity UUID to promote to app_admin. Defaults to the authenticated user.",
    example: "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  })
  @IsOptional()
  // Real Kratos identity IDs are UUIDs. @IsString() alone let any string
  // through — e.g. "not-a-real-id" — creating an orphaned user_roles row
  // that surfaces as a phantom app_admin (#108).
  @IsUUID()
  userId?: string;
}
