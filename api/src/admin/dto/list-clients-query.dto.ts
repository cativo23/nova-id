import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class ListClientsQueryDto {
  @ApiPropertyOptional({ minimum: 1, maximum: 500, default: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(500)
  pageSize?: number = 100;

  @ApiPropertyOptional({ description: 'Opaque Hydra pagination token' })
  @IsOptional()
  @IsString()
  pageToken?: string;
}
