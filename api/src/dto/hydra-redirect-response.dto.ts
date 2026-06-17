import { ApiProperty } from '@nestjs/swagger';

export class HydraRedirectResponseDto {
  @ApiProperty({
    description: 'URL the browser must follow to continue the OAuth2 flow.',
    example: 'https://hydra.nova-id.localhost/oauth2/auth?login_verifier=...',
  })
  redirect_to!: string;
}
