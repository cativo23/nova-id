import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateOauth2ClientDto {
  @ApiProperty({ description: 'Human-readable name for the OAuth2 client' })
  @IsString()
  @MinLength(1)
  client_name!: string;

  @ApiProperty({
    type: [String],
    description: 'Allowed redirect URIs for authorization code / implicit flows',
  })
  @IsArray()
  @IsString({ each: true })
  redirect_uris!: string[];

  @ApiPropertyOptional({
    type: [String],
    description: 'Allowed OAuth2 grant types (e.g. authorization_code, client_credentials)',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  grant_types?: string[];

  @ApiPropertyOptional({
    type: [String],
    description: 'Allowed response types (e.g. code, token, id_token)',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  response_types?: string[];

  @ApiPropertyOptional({
    description: 'Space-separated list of requested scopes',
  })
  @IsOptional()
  @IsString()
  scope?: string;

  @ApiPropertyOptional({
    description: 'Token endpoint authentication method (e.g. client_secret_basic, none)',
  })
  @IsOptional()
  @IsString()
  token_endpoint_auth_method?: string;
}
