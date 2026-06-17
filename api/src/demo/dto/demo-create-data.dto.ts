import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsISO8601, IsOptional, IsString } from 'class-validator';

/**
 * Body for POST /data, POST /create, POST /app-user-data.
 *
 * These endpoints echo back whatever they receive as `created` — the shape is
 * intentionally freeform for demo purposes. We accept the two fields the
 * frontend-app always sends, plus nothing else (forbidNonWhitelisted=true).
 */
export class DemoCreateDataDto {
  @ApiPropertyOptional({
    description: 'ISO-8601 timestamp injected by the frontend-app',
    example: '2026-06-17T00:00:00.000Z',
  })
  @IsOptional()
  @IsISO8601()
  timestamp?: string;

  @ApiPropertyOptional({
    description: 'Caller identifier injected by the frontend-app',
    example: 'frontend-app',
  })
  @IsOptional()
  @IsString()
  source?: string;
}
