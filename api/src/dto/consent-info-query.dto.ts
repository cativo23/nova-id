import { IsString, IsNotEmpty, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ConsentInfoQueryDto {
  @ApiProperty({ description: 'Hydra consent challenge token' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(4096)
  consent_challenge!: string;
}
