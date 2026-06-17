import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class AcceptHydraLoginDto {
  @ApiProperty({
    description: 'The Hydra login challenge issued at the start of the OAuth2 authorization flow.',
    example: 'a1b2c3d4e5f6...',
  })
  @IsString()
  @IsNotEmpty()
  login_challenge!: string;
}
