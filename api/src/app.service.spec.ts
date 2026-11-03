import { AppService } from './app.service';

function makeHydra() {
  return {
    getLoginRequest: jest.fn(),
    acceptLogin: jest.fn().mockResolvedValue({ redirect_to: 'http://login-ok' }),
    getConsentRequest: jest.fn(),
    acceptConsent: jest.fn().mockResolvedValue({ redirect_to: 'http://consent-ok' }),
    rejectConsent: jest.fn().mockResolvedValue({ redirect_to: 'http://denied' }),
  };
}
function makeKeto() {
  return { checkApp: jest.fn() };
}
function makeAudit() {
  return { record: jest.fn().mockResolvedValue(undefined) };
}
function makeBinding() {
  // Default: the challenge IS bound to the calling user, so pre-existing
  // non-skip tests (which don't care about the binding) keep passing. Tests
  // that exercise the binding gate override isBoundTo explicitly.
  return {
    register: jest.fn().mockResolvedValue(undefined),
    isBoundTo: jest.fn().mockResolvedValue(true),
  };
}
const user = {
  userId: 'u1',
  email: 'a@b.c',
  full_name: 'A B',
  role: 'platform_admin',
  authMethod: 'jwt' as const,
  jwtClaims: {},
};

describe('AppService.acceptHydraLogin', () => {
  it('honors skip=true: accepts with subject only, no context claims', async () => {
    const hydra = makeHydra();
    hydra.getLoginRequest.mockResolvedValue({ skip: true, subject: 'u1' });
    const svc = new AppService(hydra as any, makeKeto() as any, makeAudit() as any, makeBinding() as any);

    await svc.acceptHydraLogin(user, 'chal');

    expect(hydra.getLoginRequest).toHaveBeenCalledWith('chal');
    const body = hydra.acceptLogin.mock.calls[0][1];
    expect(body.subject).toBe('u1');
    expect(body.context).toBeUndefined();
    expect(body.session).toBeUndefined();
  });

  it('skip=true + mismatched subject: throws ForbiddenException, never accepts the remembered subject', async () => {
    const hydra = makeHydra();
    hydra.getLoginRequest.mockResolvedValue({ skip: true, subject: 'other-user' });
    const svc = new AppService(hydra as any, makeKeto() as any, makeAudit() as any, makeBinding() as any);

    await expect(svc.acceptHydraLogin(user, 'chal')).rejects.toThrow(
      'Login challenge subject does not belong to current user',
    );
    expect(hydra.acceptLogin).not.toHaveBeenCalled();
  });

  it('skip=false: puts claims on context, never on session', async () => {
    const hydra = makeHydra();
    hydra.getLoginRequest.mockResolvedValue({ skip: false });
    const svc = new AppService(hydra as any, makeKeto() as any, makeAudit() as any, makeBinding() as any);

    await svc.acceptHydraLogin(user, 'chal');

    const body = hydra.acceptLogin.mock.calls[0][1];
    expect(body.subject).toBe('u1');
    expect(body.session).toBeUndefined();
    expect(body.context).toEqual({ email: 'a@b.c', name: 'A B', role: 'platform_admin' });
    expect(JSON.stringify(body)).not.toContain('appRole');
  });

  it('records a login.accept audit entry after a successful accept', async () => {
    const hydra = makeHydra();
    hydra.getLoginRequest.mockResolvedValue({ skip: false });
    const audit = makeAudit();
    const svc = new AppService(hydra as any, makeKeto() as any, audit as any, makeBinding() as any);

    await svc.acceptHydraLogin(user, 'chal');

    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ actorId: 'u1', action: 'login.accept' }),
    );
  });

  it('IDOR-blocked login never records a login.accept audit entry', async () => {
    const hydra = makeHydra();
    hydra.getLoginRequest.mockResolvedValue({ skip: true, subject: 'other-user' });
    const audit = makeAudit();
    const svc = new AppService(hydra as any, makeKeto() as any, audit as any, makeBinding() as any);

    await expect(svc.acceptHydraLogin(user, 'chal')).rejects.toThrow();
    expect(audit.record).not.toHaveBeenCalled();
  });

  it('skip=false with NO binding for the caller: throws ForbiddenException and never accepts', async () => {
    const hydra = makeHydra();
    hydra.getLoginRequest.mockResolvedValue({ skip: false });
    const binding = makeBinding();
    binding.isBoundTo.mockResolvedValue(false);
    const svc = new AppService(hydra as any, makeKeto() as any, makeAudit() as any, binding as any);

    await expect(svc.acceptHydraLogin(user, 'chal')).rejects.toThrow(
      'Login challenge is not bound to the current user',
    );
    expect(binding.isBoundTo).toHaveBeenCalledWith('u1', 'chal');
    expect(hydra.acceptLogin).not.toHaveBeenCalled();
  });

  it('skip=false with a binding owned by the caller: verifies the binding then accepts', async () => {
    const hydra = makeHydra();
    hydra.getLoginRequest.mockResolvedValue({ skip: false });
    const binding = makeBinding();
    binding.isBoundTo.mockResolvedValue(true);
    const svc = new AppService(hydra as any, makeKeto() as any, makeAudit() as any, binding as any);

    await svc.acceptHydraLogin(user, 'chal');

    expect(binding.isBoundTo).toHaveBeenCalledWith('u1', 'chal');
    expect(hydra.acceptLogin).toHaveBeenCalledTimes(1);
    expect(hydra.acceptLogin.mock.calls[0][1].subject).toBe('u1');
  });

  it('skip=false binding-blocked login never records a login.accept audit entry', async () => {
    const hydra = makeHydra();
    hydra.getLoginRequest.mockResolvedValue({ skip: false });
    const binding = makeBinding();
    binding.isBoundTo.mockResolvedValue(false);
    const audit = makeAudit();
    const svc = new AppService(hydra as any, makeKeto() as any, audit as any, binding as any);

    await expect(svc.acceptHydraLogin(user, 'chal')).rejects.toThrow();
    expect(audit.record).not.toHaveBeenCalled();
  });

  it('skip=true does NOT require a binding (skip path is guarded by subject-match only)', async () => {
    const hydra = makeHydra();
    hydra.getLoginRequest.mockResolvedValue({ skip: true, subject: 'u1' });
    const binding = makeBinding();
    // Even if no binding was ever registered, a valid skip must still succeed.
    binding.isBoundTo.mockResolvedValue(false);
    const svc = new AppService(hydra as any, makeKeto() as any, makeAudit() as any, binding as any);

    await svc.acceptHydraLogin(user, 'chal');

    expect(binding.isBoundTo).not.toHaveBeenCalled();
    expect(hydra.acceptLogin).toHaveBeenCalledTimes(1);
  });
});

describe('AppService.registerHydraLoginBinding', () => {
  it('delegates to the binding store with the authenticated userId and challenge', async () => {
    const binding = makeBinding();
    const svc = new AppService(makeHydra() as any, makeKeto() as any, makeAudit() as any, binding as any);

    await svc.registerHydraLoginBinding(user, 'chal');

    expect(binding.register).toHaveBeenCalledWith('u1', 'chal');
  });

  it('propagates a ForbiddenException when the challenge is already bound to someone else', async () => {
    const binding = makeBinding();
    binding.register.mockRejectedValue(new ForbiddenExceptionStub('already bound'));
    const svc = new AppService(makeHydra() as any, makeKeto() as any, makeAudit() as any, binding as any);

    await expect(svc.registerHydraLoginBinding(user, 'chal')).rejects.toThrow('already bound');
  });
});

class ForbiddenExceptionStub extends Error {}

describe('AppService.acceptHydraConsent', () => {
  it('rejects non-members with access_denied and never accepts', async () => {
    const hydra = makeHydra();
    hydra.getConsentRequest.mockResolvedValue({
      subject: 'u1',
      client: { client_id: 'nova-id-test-app' },
      requested_access_token_audience: ['aud1'],
      requested_scope: ['openid'],
    });
    const keto = makeKeto();
    keto.checkApp.mockResolvedValue(false);
    const svc = new AppService(hydra as any, keto as any, makeAudit() as any, makeBinding() as any);

    const out = await svc.acceptHydraConsent(user, { consent_challenge: 'cc', grant_scope: ['openid'] });

    expect(keto.checkApp).toHaveBeenCalledWith('u1', 'nova-id-test-app');
    expect(hydra.acceptConsent).not.toHaveBeenCalled();
    expect(hydra.rejectConsent).toHaveBeenCalledWith('cc', expect.objectContaining({ error: 'access_denied' }));
    expect(out.redirect_to).toBe('http://denied');
  });

  it('consent.deny: does NOT record the deny audit entry if rejectConsent itself fails (never log a deny that never happened)', async () => {
    const hydra = makeHydra();
    hydra.getConsentRequest.mockResolvedValue({
      subject: 'u1',
      client: { client_id: 'nova-id-test-app' },
      requested_access_token_audience: ['aud1'],
      requested_scope: ['openid'],
    });
    hydra.rejectConsent.mockRejectedValue(new Error('hydra unreachable'));
    const keto = makeKeto();
    keto.checkApp.mockResolvedValue(false);
    const audit = makeAudit();
    const svc = new AppService(hydra as any, keto as any, audit as any, makeBinding() as any);

    await expect(
      svc.acceptHydraConsent(user, { consent_challenge: 'cc', grant_scope: ['openid'] }),
    ).rejects.toThrow();
    expect(audit.record).not.toHaveBeenCalled();
  });

  it('consent.deny: emits audit record with action=consent.deny, actorId, appId, targetType=app', async () => {
    const hydra = makeHydra();
    hydra.getConsentRequest.mockResolvedValue({
      subject: 'u1',
      client: { client_id: 'nova-id-test-app' },
      requested_access_token_audience: ['aud1'],
      requested_scope: ['openid'],
    });
    const keto = makeKeto();
    keto.checkApp.mockResolvedValue(false);
    const audit = makeAudit();
    const svc = new AppService(hydra as any, keto as any, audit as any, makeBinding() as any);

    await svc.acceptHydraConsent(user, { consent_challenge: 'cc', grant_scope: ['openid'] });

    expect(audit.record).toHaveBeenCalledTimes(1);
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({
        actorId: 'u1',
        action: 'consent.deny',
        appId: 'nova-id-test-app',
        targetType: 'app',
      }),
    );
  });

  it('members: accepts with trusted audience, role on id_token AND access_token, app:member scope, no appRole', async () => {
    const hydra = makeHydra();
    hydra.getConsentRequest.mockResolvedValue({
      subject: 'u1',
      client: { client_id: 'nova-id-test-app' },
      requested_access_token_audience: ['aud1', 'aud2'],
      requested_scope: ['openid', 'profile'],
    });
    const keto = makeKeto();
    keto.checkApp.mockResolvedValue(true);
    const svc = new AppService(hydra as any, keto as any, makeAudit() as any, makeBinding() as any);

    await svc.acceptHydraConsent(user, { consent_challenge: 'cc', grant_scope: ['openid', 'profile'] });

    expect(hydra.rejectConsent).not.toHaveBeenCalled();
    const body = hydra.acceptConsent.mock.calls[0][1];
    // trusted audience from the consent request, NOT the browser body
    expect(body.grant_access_token_audience).toEqual(['aud1', 'aud2']);
    // role on both token surfaces
    expect(body.session.id_token.role).toBe('platform_admin');
    expect(body.session.access_token.role).toBe('platform_admin');
    // membership claim + scope
    expect(body.grant_scope).toContain('app:member');
    expect(body.session.access_token.app_access).toBe(true);
    // NEVER appRole
    expect(JSON.stringify(body)).not.toContain('appRole');
  });

  it('consent.grant: emits audit record on the successful grant path (previously only denials were logged)', async () => {
    const hydra = makeHydra();
    hydra.getConsentRequest.mockResolvedValue({
      subject: 'u1',
      client: { client_id: 'nova-id-test-app' },
      requested_access_token_audience: ['aud1'],
      requested_scope: ['openid', 'profile'],
    });
    const keto = makeKeto();
    keto.checkApp.mockResolvedValue(true);
    const audit = makeAudit();
    const svc = new AppService(hydra as any, keto as any, audit as any, makeBinding() as any);

    await svc.acceptHydraConsent(user, { consent_challenge: 'cc', grant_scope: ['openid', 'profile'] });

    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({
        actorId: 'u1',
        action: 'consent.grant',
        appId: 'nova-id-test-app',
        targetType: 'app',
        metadata: expect.objectContaining({ scopes: expect.arrayContaining(['openid', 'profile', 'app:member']) }),
      }),
    );
  });

  it('scope intersection: forged extra scope in body is dropped when not in requested_scope', async () => {
    const hydra = makeHydra();
    hydra.getConsentRequest.mockResolvedValue({
      subject: 'u1',
      client: { client_id: 'nova-id-test-app' },
      requested_access_token_audience: [],
      // Client only requested openid — NOT "admin:write"
      requested_scope: ['openid'],
    });
    const keto = makeKeto();
    keto.checkApp.mockResolvedValue(true);
    const svc = new AppService(hydra as any, keto as any, makeAudit() as any, makeBinding() as any);

    // Tampered body includes a scope the client never requested
    await svc.acceptHydraConsent(user, {
      consent_challenge: 'cc',
      grant_scope: ['openid', 'admin:write'],
    });

    const body = hydra.acceptConsent.mock.calls[0][1];
    // 'openid' is in requested_scope → should be present
    expect(body.grant_scope).toContain('openid');
    // 'app:member' is always added
    expect(body.grant_scope).toContain('app:member');
    // 'admin:write' was NOT in requested_scope → must be absent
    expect(body.grant_scope).not.toContain('admin:write');
  });

  it('scope intersection: legitimately-requested scopes all pass through', async () => {
    const hydra = makeHydra();
    hydra.getConsentRequest.mockResolvedValue({
      subject: 'u1',
      client: { client_id: 'nova-id-test-app' },
      requested_access_token_audience: [],
      requested_scope: ['openid', 'profile', 'email'],
    });
    const keto = makeKeto();
    keto.checkApp.mockResolvedValue(true);
    const svc = new AppService(hydra as any, keto as any, makeAudit() as any, makeBinding() as any);

    await svc.acceptHydraConsent(user, {
      consent_challenge: 'cc',
      grant_scope: ['openid', 'profile', 'email'],
    });

    const body = hydra.acceptConsent.mock.calls[0][1];
    expect(body.grant_scope).toContain('openid');
    expect(body.grant_scope).toContain('profile');
    expect(body.grant_scope).toContain('email');
    expect(body.grant_scope).toContain('app:member');
  });

  it('IDOR: throws ForbiddenException when challenge subject does not match user', async () => {
    const hydra = makeHydra();
    hydra.getConsentRequest.mockResolvedValue({
      subject: 'other-user',
      client: { client_id: 'nova-id-test-app' },
      requested_access_token_audience: [],
      requested_scope: ['openid'],
    });
    const keto = makeKeto();
    keto.checkApp.mockResolvedValue(true);
    const svc = new AppService(hydra as any, keto as any, makeAudit() as any, makeBinding() as any);

    await expect(
      svc.acceptHydraConsent(user, { consent_challenge: 'cc', grant_scope: ['openid'] }),
    ).rejects.toThrow('Consent challenge does not belong to current user');
    expect(hydra.acceptConsent).not.toHaveBeenCalled();
    expect(hydra.rejectConsent).not.toHaveBeenCalled();
  });

  it('passes ownership check when challenge subject matches user', async () => {
    const hydra = makeHydra();
    hydra.getConsentRequest.mockResolvedValue({
      subject: 'u1',
      client: { client_id: 'nova-id-test-app' },
      requested_access_token_audience: [],
      requested_scope: ['openid'],
    });
    const keto = makeKeto();
    keto.checkApp.mockResolvedValue(true);
    const svc = new AppService(hydra as any, keto as any, makeAudit() as any, makeBinding() as any);

    await expect(
      svc.acceptHydraConsent(user, { consent_challenge: 'cc', grant_scope: ['openid'] }),
    ).resolves.toBeDefined();
  });

  it('null-subject: rejects with ForbiddenException and never accepts nor rejects the consent', async () => {
    const hydra = makeHydra();
    hydra.getConsentRequest.mockResolvedValue({
      client: { client_id: 'nova-id-test-app' },
      requested_access_token_audience: [],
      requested_scope: ['openid'],
    });
    const keto = makeKeto();
    keto.checkApp.mockResolvedValue(true);
    const svc = new AppService(hydra as any, keto as any, makeAudit() as any, makeBinding() as any);

    await expect(
      svc.acceptHydraConsent(user, { consent_challenge: 'cc', grant_scope: ['openid'] }),
    ).rejects.toThrow('Consent challenge does not belong to current user');
    expect(hydra.acceptConsent).not.toHaveBeenCalled();
    expect(hydra.rejectConsent).not.toHaveBeenCalled();
  });
});

describe('AppService.getHydraConsentInfo', () => {
  it('returns consent info for the authenticated user', async () => {
    const hydra = makeHydra();
    hydra.getConsentRequest.mockResolvedValue({
      subject: 'u1',
      skip: false,
      requested_scope: ['openid'],
      client: { client_id: 'app1', client_name: 'App One' },
    });
    const svc = new AppService(hydra as any, makeKeto() as any, makeAudit() as any, makeBinding() as any);

    const result = await svc.getHydraConsentInfo(user, 'chal');

    expect(result.subject).toBe('u1');
    expect(result.client?.client_id).toBe('app1');
    expect(result.requested_scope).toContain('openid');
  });

  it('IDOR: throws ForbiddenException when challenge subject does not match user', async () => {
    const hydra = makeHydra();
    hydra.getConsentRequest.mockResolvedValue({
      subject: 'attacker-user',
      skip: false,
      requested_scope: ['openid'],
      client: { client_id: 'app1', client_name: 'App One' },
    });
    const svc = new AppService(hydra as any, makeKeto() as any, makeAudit() as any, makeBinding() as any);

    await expect(svc.getHydraConsentInfo(user, 'chal')).rejects.toThrow(
      'Consent challenge does not belong to current user',
    );
  });

  it('null-subject: rejects with ForbiddenException instead of skipping the ownership check', async () => {
    const hydra = makeHydra();
    hydra.getConsentRequest.mockResolvedValue({
      skip: false,
      requested_scope: ['openid'],
      client: { client_id: 'app1', client_name: 'App One' },
    });
    const svc = new AppService(hydra as any, makeKeto() as any, makeAudit() as any, makeBinding() as any);

    await expect(svc.getHydraConsentInfo(user, 'chal')).rejects.toThrow(
      'Consent challenge does not belong to current user',
    );
  });
});

describe('AppService.rejectHydraConsent', () => {
  it('rejects consent and records audit with appId captured from consent request', async () => {
    const hydra = makeHydra();
    hydra.getConsentRequest.mockResolvedValue({
      subject: 'u1',
      client: { client_id: 'my-app' },
    });
    const audit = makeAudit();
    const svc = new AppService(hydra as any, makeKeto() as any, audit as any, makeBinding() as any);

    const result = await svc.rejectHydraConsent(user, { consent_challenge: 'chal' });

    expect(hydra.getConsentRequest).toHaveBeenCalledWith('chal');
    expect(hydra.rejectConsent).toHaveBeenCalledWith(
      'chal',
      expect.objectContaining({ error: 'access_denied' }),
    );
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({
        actorId: 'u1',
        action: 'consent.user_reject',
        appId: 'my-app',
        targetType: 'app',
      }),
    );
    expect(result.redirect_to).toBe('http://denied');
  });

  it('IDOR: throws ForbiddenException when challenge subject does not match user', async () => {
    const hydra = makeHydra();
    hydra.getConsentRequest.mockResolvedValue({
      subject: 'someone-else',
      client: { client_id: 'my-app' },
    });
    const svc = new AppService(hydra as any, makeKeto() as any, makeAudit() as any, makeBinding() as any);

    await expect(svc.rejectHydraConsent(user, { consent_challenge: 'chal' })).rejects.toThrow(
      'Consent challenge does not belong to current user',
    );
    expect(hydra.rejectConsent).not.toHaveBeenCalled();
  });

  it('null-subject: rejects with ForbiddenException and never rejects the consent', async () => {
    const hydra = makeHydra();
    hydra.getConsentRequest.mockResolvedValue({
      client: { client_id: 'my-app' },
    });
    const svc = new AppService(hydra as any, makeKeto() as any, makeAudit() as any, makeBinding() as any);

    await expect(svc.rejectHydraConsent(user, { consent_challenge: 'chal' })).rejects.toThrow(
      'Consent challenge does not belong to current user',
    );
    expect(hydra.rejectConsent).not.toHaveBeenCalled();
  });

  it('records appId=null when consent request has no client', async () => {
    const hydra = makeHydra();
    hydra.getConsentRequest.mockResolvedValue({
      subject: 'u1',
    });
    const audit = makeAudit();
    const svc = new AppService(hydra as any, makeKeto() as any, audit as any, makeBinding() as any);

    await svc.rejectHydraConsent(user, { consent_challenge: 'chal' });

    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ appId: null }),
    );
  });
});
