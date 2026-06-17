import { Module } from '@nestjs/common';
import { AdminUsersController } from './admin-users.controller';
import { PlatformManageUsersGuard } from '../guards/platform-manage-users.guard';
import { AuditModule } from '../audit/audit.module';

// OryModule is @Global() — KratosAdminService and KetoService are available without a local import.
@Module({
  imports: [AuditModule],
  controllers: [AdminUsersController],
  providers: [PlatformManageUsersGuard],
})
export class AdminModule {}
