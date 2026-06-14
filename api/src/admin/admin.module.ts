import { Module } from '@nestjs/common';
import { AdminUsersController } from './admin-users.controller';
import { PlatformManageUsersGuard } from '../guards/platform-manage-users.guard';

// OryModule is @Global() — KratosAdminService and KetoService are available without a local import.
@Module({
  controllers: [AdminUsersController],
  providers: [PlatformManageUsersGuard],
})
export class AdminModule {}
