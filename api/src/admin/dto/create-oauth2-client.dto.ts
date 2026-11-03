import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ArrayNotEmpty, IsArray, IsIn, IsOptional, IsString, MinLength } from 'class-validator';
import { IsSecureRedirectUri } from './validators/secure-redirect-uri.validator';

export class CreateOauth2ClientDto {
  @ApiProperty({ description: 'Human-readable name for the OAuth2 client' })
  @IsString()
  @MinLength(1)
  client_name!: string;

  @ApiProperty({
    type: [String],
    description:
      'Allowed redirect URIs for authorization code / implicit flows. Must be https:// ' +
      'except for the RFC 8252 native-app loopback exception (http://localhost|127.0.0.1|[::1]).',
  })
  @IsArray()
  @ArrayNotEmpty()
  @IsSecureRedirectUri({ each: true })
  redirect_uris!: string[];

  @ApiPropertyOptional({
    enum: ['authorization_code', 'client_credentials', 'refresh_token'],
    isArray: true,
    required: false,
    description: 'Allowed OAuth2 grant types',
  })
  @IsOptional()
  @IsArray()
  @IsIn(['authorization_code', 'client_credentials', 'refresh_token'], { each: true })
  grant_types?: string[];

  @ApiPropertyOptional({
    enum: ['code'],
    isArray: true,
    required: false,
    description: 'Allowed response types',
  })
  @IsOptional()
  @IsArray()
  @IsIn(['code'], { each: true })
  response_types?: string[];

  @ApiPropertyOptional({
    description: 'Space-separated list of requested scopes',
  })
  @IsOptional()
  @IsString()
  scope?: string;

  @ApiPropertyOptional({
    enum: ['client_secret_basic', 'client_secret_post', 'none'],
    required: false,
    description: 'Token endpoint authentication method',
  })
  @IsOptional()
  @IsIn(['client_secret_basic', 'client_secret_post', 'none'])
  token_endpoint_auth_method?: string;
}
