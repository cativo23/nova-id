import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { Identity } from '@ory/client';

export class UserResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() email!: string;
  @ApiProperty() fullName!: string;
  @ApiPropertyOptional({ enum: ['platform_admin', 'platform_user'] })
  role?: string;
  @ApiProperty() state!: string;
  @ApiProperty() createdAt!: string;

  static fromIdentity(i: Identity): UserResponseDto {
    const traits = (i.traits ?? {}) as { email?: string; full_name?: string };
    const meta = (i.metadata_public ?? {}) as { role?: string };
    const dto = new UserResponseDto();
    dto.id = i.id;
    dto.email = traits.email ?? '';
    dto.fullName = traits.full_name ?? '';
    dto.role = meta.role;
    dto.state = i.state ?? 'active';
    dto.createdAt = i.created_at ?? '';
    return dto;
  }
}
