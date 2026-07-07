import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { OAuth2Client } from '@ory/hydra-client';

export class PaginatedClientsDto {
  @ApiProperty({ description: 'Page of OAuth2 client records' })
  data!: OAuth2Client[];

  @ApiPropertyOptional({
    description: 'Opaque Hydra cursor for the next page; null when there are no further pages.',
    nullable: true,
  })
  nextPageToken!: string | null;
}
