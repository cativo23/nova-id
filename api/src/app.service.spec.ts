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
    const svc = new AppService(hydra as any, makeKeto() as any, makeAudit() as any);

    await svc.acceptHydraLogin(user, 'chal');

    expect(hydra.getLoginRequest).toHaveBeenCalledWith('chal');
    const body = hydra.acceptLogin.mock.calls[0][1];
    expect(body.subject).toBe('u1');
    expect(body.context).toBeUndefined();
    expect(body.session).toBeUndefined();
  });

  it('skip=false: puts claims on context, never on session', async () => {
    const hydra = makeHydra();
    hydra.getLoginRequest.mockResolvedValue({ skip: false });
    const svc = new AppService(hydra as any, makeKeto() as any, makeAudit() as any);

    await svc.acceptHydraLogin(user, 'chal');

    const body = hydra.acceptLogin.mock.calls[0][1];
    expect(body.subject).toBe('u1');
    expect(body.session).toBeUndefined();
    expect(body.context).toEqual({ email: 'a@b.c', name: 'A B', role: 'platform_admin' });
    expect(JSON.stringify(body)).not.toContain('appRole');
  });
});

describe('AppService.acceptHydraConsent', () => {
  it('rejects non-members with access_denied and never accepts', async () => {
    const hydra = makeHydra();
    hydra.getConsentRequest.mockResolvedValue({
      client: { client_id: 'nova-id-test-app' },
      requested_access_token_audience: ['aud1'],
      requested_scope: ['openid'],
    });
    const keto = makeKeto();
    keto.checkApp.mockResolvedValue(false);
    const svc = new AppService(hydra as any, keto as any, makeAudit() as any);

    const out = await svc.acceptHydraConsent(user, { consent_challenge: 'cc', grant_scope: ['openid'] });

    expect(keto.checkApp).toHaveBeenCalledWith('u1', 'nova-id-test-app');
    expect(hydra.acceptConsent).not.toHaveBeenCalled();
    expect(hydra.rejectConsent).toHaveBeenCalledWith('cc', expect.objectContaining({ error: 'access_denied' }));
    expect(out.redirect_to).toBe('http://denied');
  });

  it('consent.deny: emits audit record with action=consent.deny, actorId, appId, targetType=app', async () => {
    const hydra = makeHydra();
    hydra.getConsentRequest.mockResolvedValue({
      client: { client_id: 'nova-id-test-app' },
      requested_access_token_audience: ['aud1'],
      requested_scope: ['openid'],
    });
    const keto = makeKeto();
    keto.checkApp.mockResolvedValue(false);
    const audit = makeAudit();
    const svc = new AppService(hydra as any, keto as any, audit as any);

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
      client: { client_id: 'nova-id-test-app' },
      requested_access_token_audience: ['aud1', 'aud2'],
      requested_scope: ['openid', 'profile'],
    });
    const keto = makeKeto();
    keto.checkApp.mockResolvedValue(true);
    const svc = new AppService(hydra as any, keto as any, makeAudit() as any);

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

  it('scope intersection: forged extra scope in body is dropped when not in requested_scope', async () => {
    const hydra = makeHydra();
    hydra.getConsentRequest.mockResolvedValue({
      client: { client_id: 'nova-id-test-app' },
      requested_access_token_audience: [],
      // Client only requested openid — NOT "admin:write"
      requested_scope: ['openid'],
    });
    const keto = makeKeto();
    keto.checkApp.mockResolvedValue(true);
    const svc = new AppService(hydra as any, keto as any, makeAudit() as any);

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
      client: { client_id: 'nova-id-test-app' },
      requested_access_token_audience: [],
      requested_scope: ['openid', 'profile', 'email'],
    });
    const keto = makeKeto();
    keto.checkApp.mockResolvedValue(true);
    const svc = new AppService(hydra as any, keto as any, makeAudit() as any);

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
    const svc = new AppService(hydra as any, keto as any, makeAudit() as any);

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
    const svc = new AppService(hydra as any, keto as any, makeAudit() as any);

    await expect(
      svc.acceptHydraConsent(user, { consent_challenge: 'cc', grant_scope: ['openid'] }),
    ).resolves.toBeDefined();
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
    const svc = new AppService(hydra as any, makeKeto() as any, makeAudit() as any);

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
    const svc = new AppService(hydra as any, makeKeto() as any, makeAudit() as any);

    await expect(svc.getHydraConsentInfo(user, 'chal')).rejects.toThrow(
      'Consent challenge does not belong to current user',
    );
  });

  it('skips ownership check when subject is absent (challenge not yet bound)', async () => {
    const hydra = makeHydra();
    hydra.getConsentRequest.mockResolvedValue({
      skip: false,
      requested_scope: ['openid'],
      client: { client_id: 'app1', client_name: 'App One' },
    });
    const svc = new AppService(hydra as any, makeKeto() as any, makeAudit() as any);

    await expect(svc.getHydraConsentInfo(user, 'chal')).resolves.toBeDefined();
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
    const svc = new AppService(hydra as any, makeKeto() as any, audit as any);

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
    const svc = new AppService(hydra as any, makeKeto() as any, makeAudit() as any);

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
    const svc = new AppService(hydra as any, makeKeto() as any, audit as any);

    await svc.rejectHydraConsent(user, { consent_challenge: 'chal' });

    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ appId: null }),
    );
  });
});
