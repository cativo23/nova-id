import { Module, Global } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { AuthenticatedGuard } from '../guards/authenticated.guard';
import { LoggingInterceptor } from '../interceptors/logging.interceptor';
import { LogsModule } from '../logs/logs.module';

@Global()
@Module({
  imports: [LogsModule],
  providers: [
    {
      provide: APP_GUARD,
      useClass: AuthenticatedGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
  ],
})
export class AuthModule { }
