import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsIn, IsOptional, IsString, MinLength } from 'class-validator';

export class UpdateUserDto {
  @ApiPropertyOptional({ format: 'email' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ minLength: 1 })
  @IsOptional()
  @IsString()
  @MinLength(1)
  fullName?: string;

  @ApiPropertyOptional({
    enum: ['platform_admin', 'platform_user'],
    description:
      'Sets the JWT `role` claim (via Oathkeeper id_token mutator reading metadata_public.role). ' +
      'Does NOT grant Platform admin (manage_users/administer) — that lives in Keto (A1-plan-2).',
  })
  @IsOptional()
  @IsString()
  @IsIn(['platform_admin', 'platform_user'])
  role?: 'platform_admin' | 'platform_user';
}
