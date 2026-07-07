import { ForbiddenException, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LoginChallengeBinding } from './login-challenge-binding.entity';

/**
 * LoginBindingService — first-write-wins ownership store for Hydra login
 * challenges (VULN-0002).
 *
 * Security model
 * --------------
 * `register()` is called by the SPA the moment the authenticated browser first
 * presents a login_challenge (right after Kratos authentication, before consent).
 * It claims the challenge for the caller's Kratos identity. The claim is
 * immutable: the UNIQUE constraint on loginChallenge means a *different* identity
 * cannot re-bind an already-claimed challenge.
 *
 * `isBoundTo()` is the fail-closed gate consulted by acceptHydraLogin on the
 * non-skip path: the accept only proceeds if a NON-expired binding for the
 * challenge exists AND is owned by the calling identity.
 *
 * What stops an attacker from registering the binding first: the victim's own
 * browser registers the challenge automatically and immediately upon completing
 * Kratos auth — there is no human step between auth success and registration. To
 * win, an attacker would have to (a) already possess the victim's in-flight
 * challenge (a per-flow secret that only lives in the victim's browser URL) AND
 * (b) beat the victim's browser to the register call. Even then, Hydra's login
 * CSRF cookie still prevents completing the login in the attacker's browser
 * (no account takeover) — this store closes the remaining login-DoS vector by
 * turning "any authenticated user consumes any challenge" into an ownership
 * check. Residual: an attacker who pre-leaks the challenge and wins the race can
 * still deny the victim's login; the victim simply restarts the flow.
 */
@Injectable()
export class LoginBindingService {
  private readonly logger = new Logger(LoginBindingService.name);

  /** Bindings older than this are treated as expired at read time. */
  static readonly TTL_MS = 10 * 60 * 1000; // 10 minutes

  constructor(
    @InjectRepository(LoginChallengeBinding, 'audit')
    private readonly repo: Repository<LoginChallengeBinding>,
  ) {}

  /**
   * Claim `loginChallenge` for `userId` (first-write-wins).
   *
   * - Idempotent: re-registering the same challenge for the SAME user is a no-op
   *   (covers SPA reloads / retries).
   * - Fail-closed: if the challenge is already claimed by a DIFFERENT identity,
   *   throws ForbiddenException — the caller is not the owner.
   */
  async register(userId: string, loginChallenge: string): Promise<void> {
    const existing = await this.repo.findOne({ where: { loginChallenge } });
    if (existing) {
      if (existing.userId === userId) return; // idempotent
      this.logger.warn(
        `Login binding conflict: challenge already claimed by another identity (caller ${userId})`,
      );
      throw new ForbiddenException('Login challenge is already claimed by another session');
    }

    try {
      const row = this.repo.create({ userId, loginChallenge });
      await this.repo.save(row);
    } catch (err) {
      // Concurrent claim: a UNIQUE violation (Postgres 23505) means another
      // request inserted the same challenge between our findOne and save.
      // Re-evaluate ownership rather than surfacing a raw 500.
      if (isUniqueViolation(err)) {
        const winner = await this.repo.findOne({ where: { loginChallenge } });
        if (winner && winner.userId === userId) return; // we (or our own retry) won
        this.logger.warn(
          `Login binding race lost: challenge claimed by another identity (caller ${userId})`,
        );
        throw new ForbiddenException('Login challenge is already claimed by another session');
      }
      throw err;
    }
  }

  /**
   * True only if a NON-expired binding for `loginChallenge` exists and is owned
   * by `userId`. Any other case (missing, expired, owned by someone else) → false.
   */
  async isBoundTo(userId: string, loginChallenge: string): Promise<boolean> {
    const existing = await this.repo.findOne({ where: { loginChallenge } });
    if (!existing) return false;
    const age = Date.now() - new Date(existing.createdAt).getTime();
    if (age > LoginBindingService.TTL_MS) return false; // expired
    return existing.userId === userId;
  }
}

/** Detects a Postgres unique-constraint violation (SQLSTATE 23505). */
function isUniqueViolation(err: unknown): boolean {
  const code =
    (err as { code?: string })?.code ??
    (err as { driverError?: { code?: string } })?.driverError?.code;
  return code === '23505';
}
