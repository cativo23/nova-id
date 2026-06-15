import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { DemoModule } from './demo/demo.module';
import { OryModule } from './ory/ory.module';
import { AdminModule } from './admin/admin.module';
import { MeModule } from './me/me.module';
import { UserRole } from './demo/roles/entities/user-role.entity';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot({
      type: 'sqlite',
      database: 'data/app_roles.db',
      entities: [UserRole],
      synchronize: true,
    }),
    AuthModule,
    DemoModule,
    OryModule,
    AdminModule,
    MeModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
