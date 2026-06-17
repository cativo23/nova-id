import { ApiProperty } from '@nestjs/swagger';

export class RecoveryLinkResponseDto {
  @ApiProperty({
    description: 'One-time self-service recovery link the user can follow to reset their credentials.',
    example: 'https://nova-id.localhost/self-service/recovery?flow=...&token=...',
  })
  recovery_link!: string;
}
