import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

/**
 * Body for POST /roles/bootstrap/app-admin.
 *
 * When `userId` is omitted, the endpoint promotes the requesting platform_admin.
 */
export class BootstrapAppAdminDto {
  @ApiPropertyOptional({
    description: 'Kratos identity UUID to promote to app_admin. Defaults to the authenticated user.',
    example: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
  })
  @IsOptional()
  @IsString()
  userId?: string;
}
