import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class AcceptHydraConsentDto {
  @ApiProperty({
    description: 'The Hydra consent challenge issued by Hydra after login.',
    example: 'a1b2c3d4e5f6...',
  })
  @IsString()
  @IsNotEmpty()
  consent_challenge!: string;

  @ApiPropertyOptional({
    description:
      'Scopes the user agrees to grant. Intersected server-side with the OAuth client\'s ' +
      'requested_scope; tampered scopes are dropped.',
    type: [String],
    example: ['openid', 'offline'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  grant_scope?: string[];
}
