import { LoggingInterceptor } from './logging.interceptor';
import { of, throwError } from 'rxjs';

/**
 * LoggingInterceptor identity-extraction spec (Task 2 — M-2).
 *
 * Verifies that spoofable X-User-* headers are NEVER used; when
 * request.user is absent all identity fields fall back to 'anonymous'.
 */

function makeReflector(shouldLog: boolean) {
  return { getAllAndOverride: jest.fn().mockReturnValue(shouldLog) } as any;
}

function makeLogsService() {
  return { logAccess: jest.fn() } as any;
}

function makeContext(request: object): any {
  return {
    switchToHttp: () => ({ getRequest: () => request }),
    getHandler: () => ({}),
    getClass: () => ({}),
  };
}

describe('LoggingInterceptor — identity extraction (M-2)', () => {
  it('uses request.user fields when present', async () => {
    const logsService = makeLogsService();
    const interceptor = new LoggingInterceptor(makeReflector(true), logsService);

    const req = {
      method: 'GET',
      url: '/test',
      headers: {},
      user: { userId: 'real-uid', email: 'real@example.com', role: 'app_user' },
    };

    await new Promise<void>((resolve) => {
      interceptor.intercept(makeContext(req), { handle: () => of({ ok: true }) }).subscribe({
        complete: resolve,
      });
    });

    expect(logsService.logAccess).toHaveBeenCalledTimes(1);
    const entry = logsService.logAccess.mock.calls[0][0];
    expect(entry.user.id).toBe('real-uid');
    expect(entry.user.email).toBe('real@example.com');
    expect(entry.user.role).toBe('app_user');
  });

  it('falls back to "anonymous" for ALL identity fields when request.user is absent', async () => {
    const logsService = makeLogsService();
    const interceptor = new LoggingInterceptor(makeReflector(true), logsService);

    const req = {
      method: 'GET',
      url: '/public',
      headers: {
        // Spoofed headers — must be IGNORED
        'x-user-id': 'spoofed-uid',
        'x-user-email': 'spoofed@evil.com',
        'x-user-role': 'platform_admin',
      },
      // No user object
    };

    await new Promise<void>((resolve) => {
      interceptor.intercept(makeContext(req), { handle: () => of({}) }).subscribe({
        complete: resolve,
      });
    });

    const entry = logsService.logAccess.mock.calls[0][0];
    expect(entry.user.id).toBe('anonymous');
    expect(entry.user.email).toBe('anonymous');
    expect(entry.user.role).toBe('anonymous');
    // Confirm the spoofed values were NOT used
    expect(entry.user.id).not.toBe('spoofed-uid');
    expect(entry.user.role).not.toBe('platform_admin');
    expect(entry.user.role).not.toBe('platform_user');
  });

  it('logs "anonymous" on error path when request.user is absent', async () => {
    const logsService = makeLogsService();
    const interceptor = new LoggingInterceptor(makeReflector(true), logsService);

    const req = {
      method: 'POST',
      url: '/fail',
      headers: { 'x-user-id': 'evil', 'x-user-role': 'platform_admin' },
    };

    await new Promise<void>((resolve) => {
      interceptor
        .intercept(makeContext(req), {
          handle: () => throwError(() => ({ message: 'boom', status: 500 })),
        })
        .subscribe({ error: () => resolve() });
    });

    const entry = logsService.logAccess.mock.calls[0][0];
    expect(entry.user.id).toBe('anonymous');
    expect(entry.user.role).toBe('anonymous');
  });

  it('skips logging when @LogAccess is not set', async () => {
    const logsService = makeLogsService();
    const interceptor = new LoggingInterceptor(makeReflector(false), logsService);

    const req = { method: 'GET', url: '/no-log', headers: {} };

    await new Promise<void>((resolve) => {
      interceptor.intercept(makeContext(req), { handle: () => of({}) }).subscribe({
        complete: resolve,
      });
    });

    expect(logsService.logAccess).not.toHaveBeenCalled();
  });
});
