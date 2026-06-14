import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';

export class SetUserStateDto {
  @ApiProperty({ enum: ['active', 'inactive'] })
  @IsIn(['active', 'inactive'])
  state!: 'active' | 'inactive';
}
