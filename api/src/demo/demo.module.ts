import { Module } from '@nestjs/common';
import { RolesModule } from './roles/roles.module';

@Module({
  imports: [RolesModule],
  exports: [RolesModule],
})
export class DemoModule {}
