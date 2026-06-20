import { Module } from '@nestjs/common';
import { LogsService } from './logs.service';
import { LogsController } from './logs.controller';
import { RolesModule } from '../roles/roles.module';

/**
 * LogsModule — access logs storage and retrieval.
 *
 * RolesModule is imported so AppAdminGuard (which depends on RolesService)
 * can be resolved when applied to LogsController.
 */
@Module({
  imports: [RolesModule],
  providers: [LogsService],
  controllers: [LogsController],
  exports: [LogsService],
})
export class LogsModule {}
