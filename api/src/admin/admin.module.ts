import { Module } from '@nestjs/common';
import { AdminUsersController } from './admin-users.controller';
import { AdminClientsController } from './admin-clients.controller';
import { PlatformManageUsersGuard } from '../guards/platform-manage-users.guard';
import { PlatformAdministerGuard } from '../guards/platform-administer.guard';
import { AuditModule } from '../audit/audit.module';

// OryModule is @Global() — KratosAdminService, HydraService, and KetoService are available without a local import.
@Module({
  imports: [AuditModule],
  controllers: [AdminUsersController, AdminClientsController],
  providers: [PlatformManageUsersGuard, PlatformAdministerGuard],
})
export class AdminModule {}
