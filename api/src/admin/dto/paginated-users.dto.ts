import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserResponseDto } from './user-response.dto';

export class PaginatedUsersDto {
  @ApiProperty({ type: [UserResponseDto], description: 'Page of user records' })
  data!: UserResponseDto[];

  @ApiPropertyOptional({
    description: 'Opaque Kratos cursor for the next page; null when there are no further pages.',
    nullable: true,
  })
  nextPageToken!: string | null;
}
