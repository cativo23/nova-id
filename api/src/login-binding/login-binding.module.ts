import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoginChallengeBinding } from './login-challenge-binding.entity';
import { LoginBindingService } from './login-binding.service';

/**
 * LoginBindingModule — VULN-0002 login_challenge ownership store.
 *
 * Reuses the NAMED 'audit' TypeORM connection registered by AuditModule
 * (forRoot). AuditModule must be imported in the app for that connection to
 * exist; forFeature here only binds the repository for this entity. The table
 * is created by the audit migrator (see the CreateLoginChallengeBindings
 * migration) and inherits the append-only INSERT/SELECT grant for the runtime
 * `nova_audit_app` role — no new DB/role/infra is introduced.
 */
@Module({
  imports: [TypeOrmModule.forFeature([LoginChallengeBinding], 'audit')],
  providers: [LoginBindingService],
  exports: [LoginBindingService],
})
export class LoginBindingModule {}
