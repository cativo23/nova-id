import { Module } from '@nestjs/common';
import { MeController } from './me.controller';

// OryModule is @Global() — KetoService is available without a local import.
@Module({
  controllers: [MeController],
})
export class MeModule {}
