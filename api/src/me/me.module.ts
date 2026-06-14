import { Module } from '@nestjs/common';
import { OryModule } from '../ory/ory.module';
import { MeController } from './me.controller';

@Module({
  imports: [OryModule],
  controllers: [MeController],
})
export class MeModule {}
