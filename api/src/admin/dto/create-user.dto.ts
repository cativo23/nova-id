import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsIn, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateUserDto {
  @ApiProperty({ format: 'email' })
  @IsEmail()
  email!: string;

  @ApiProperty({ minLength: 1 })
  @IsString()
  @MinLength(1)
  fullName!: string;

  @ApiProperty({ minLength: 8, description: 'Initial password for the identity' })
  @IsString()
  @MinLength(8)
  password!: string;

  @ApiPropertyOptional({
    enum: ['platform_admin', 'platform_user'],
    default: 'platform_user',
    description:
      'Sets the JWT `role` claim (via Oathkeeper id_token mutator reading metadata_public.role). ' +
      'Does NOT grant Platform admin (manage_users/administer) — that lives in Keto (A1-plan-2).',
  })
  @IsOptional()
  @IsString()
  @IsIn(['platform_admin', 'platform_user'])
  role?: 'platform_admin' | 'platform_user';
}
