import { ApiProperty } from '@nestjs/swagger';

export class HydraConsentClientDto {
  @ApiProperty({ required: false })
  client_id?: string;

  @ApiProperty({ required: false })
  client_name?: string;
}

export class HydraConsentInfoResponseDto {
  @ApiProperty({ required: false })
  skip?: boolean;

  @ApiProperty({ type: [String], required: false })
  requested_scope?: string[];

  @ApiProperty({ type: HydraConsentClientDto, required: false })
  client?: HydraConsentClientDto;

  @ApiProperty({ required: false })
  subject?: string;
}
