import { ApiProperty } from "@nestjs/swagger";
import { IsIn, IsString } from "class-validator";

/**
 * Body for POST /roles/user/:userId and PUT /roles/user/:userId.
 */
export class SetUserRoleDto {
  @ApiProperty({
    enum: ["app_admin", "app_user"],
    description: "Target application role for the user.",
    example: "app_user",
  })
  @IsString()
  @IsIn(["app_admin", "app_user"])
  appRole!: "app_admin" | "app_user";
}
