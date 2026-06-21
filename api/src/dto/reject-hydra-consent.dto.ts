import { IsString, IsNotEmpty, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RejectHydraConsentDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  consent_challenge!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  error_description?: string;
}
