import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsString } from 'class-validator';

export class SetUserStateDto {
  @ApiProperty({ enum: ['active', 'inactive'] })
  @IsString()
  @IsIn(['active', 'inactive'])
  state!: 'active' | 'inactive';
}
