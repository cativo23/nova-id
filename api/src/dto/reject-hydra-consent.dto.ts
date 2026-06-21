import { IsString, IsNotEmpty, IsOptional, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RejectHydraConsentDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  consent_challenge!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(256)
  error_description?: string;
}
