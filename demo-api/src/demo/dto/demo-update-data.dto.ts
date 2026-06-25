import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsISO8601, IsOptional, IsString, MaxLength } from "class-validator";

/**
 * Body for PUT /:id.
 *
 * Accepts the fields the frontend-app sends for all demo POST/PUT calls.
 * The handler echoes the DTO back as `updated` — freeform by design.
 */
export class DemoUpdateDataDto {
  @ApiPropertyOptional({
    description: "ISO-8601 timestamp injected by the frontend-app",
    example: "2026-06-17T00:00:00.000Z",
  })
  @IsOptional()
  @IsISO8601()
  timestamp?: string;

  @ApiPropertyOptional({
    description: "Caller identifier injected by the frontend-app",
    example: "frontend-app",
  })
  @IsOptional()
  @IsString()
  @MaxLength(256)
  source?: string;
}
