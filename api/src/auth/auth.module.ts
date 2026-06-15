import { Module, Global } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AuthenticatedGuard } from '../guards/authenticated.guard';

@Global()
@Module({
  providers: [
    {
      provide: APP_GUARD,
      useClass: AuthenticatedGuard,
    },
  ],
})
export class AuthModule { }
