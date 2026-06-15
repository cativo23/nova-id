import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { RolesModule } from './roles/roles.module';
import { LogsModule } from './logs/logs.module';
import { LoggingInterceptor } from './logging.interceptor';

@Module({
  imports: [RolesModule, LogsModule],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
  ],
  exports: [RolesModule, LogsModule],
})
export class DemoModule {}
