import { ApiProperty } from '@nestjs/swagger';

export class PermissionsResponseDto {
  @ApiProperty() userId!: string;
  @ApiProperty({ description: 'Platform-level admin: can administer the IdP' })
  administer!: boolean;
  @ApiProperty({ description: 'Platform-level: can manage users in the shared pool' })
  manageUsers!: boolean;

  // Named capabilities consumed by the frontend (derived; keeps Keto logic server-side).
  @ApiProperty() canViewUsers!: boolean;
  @ApiProperty() canManageUsers!: boolean;
  @ApiProperty() canManagePermissions!: boolean;
  @ApiProperty() canAccessAdmin!: boolean;
}
