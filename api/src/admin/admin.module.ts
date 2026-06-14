import { Module } from '@nestjs/common';
import { OryModule } from '../ory/ory.module';
import { AdminUsersController } from './admin-users.controller';
import { PlatformManageUsersGuard } from '../guards/platform-manage-users.guard';

@Module({
  imports: [OryModule],
  controllers: [AdminUsersController],
  providers: [PlatformManageUsersGuard],
})
export class AdminModule {}
