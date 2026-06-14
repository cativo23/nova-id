import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { Identity } from '@ory/client';

export class UserResponseDto {
  @ApiProperty({ format: 'uuid', example: '550e8400-e29b-41d4-a716-446655440000' })
  id!: string;

  @ApiProperty({ format: 'email', example: 'alice@example.com' })
  email!: string;

  @ApiProperty({ example: 'Alice Smith' })
  fullName!: string;

  @ApiPropertyOptional({
    enum: ['platform_admin', 'platform_user'],
    example: 'platform_user',
    description:
      'JWT `role` claim (read by Oathkeeper id_token mutator from metadata_public.role). ' +
      'Gates RoleGuard / log access. Does NOT grant Platform admin (manage_users/administer); ' +
      'those live in Keto.',
  })
  role?: 'platform_admin' | 'platform_user';

  @ApiProperty({ enum: ['active', 'inactive'], example: 'active' })
  state!: 'active' | 'inactive';

  @ApiProperty({ format: 'date-time', example: '2024-01-15T10:00:00.000Z' })
  createdAt!: string;

  static fromIdentity(i: Identity): UserResponseDto {
    const traits = (i.traits ?? {}) as { email?: string; full_name?: string };
    const meta = (i.metadata_public ?? {}) as { role?: string };
    const dto = new UserResponseDto();
    dto.id = i.id;
    dto.email = traits.email ?? '';
    dto.fullName = traits.full_name ?? '';
    dto.role = meta.role as 'platform_admin' | 'platform_user' | undefined;
    dto.state = (i.state ?? 'active') as 'active' | 'inactive';
    dto.createdAt = i.created_at ?? '';
    return dto;
  }
}
