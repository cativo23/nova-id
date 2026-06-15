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
const user = { userId: 'u1', email: 'a@b.c', full_name: 'A B', role: 'platform_admin' };

describe('AppService.acceptHydraLogin', () => {
  it('honors skip=true: accepts with subject only, no context claims', async () => {
    const hydra = makeHydra();
    hydra.getLoginRequest.mockResolvedValue({ skip: true, subject: 'u1' });
    const svc = new AppService(hydra as any, makeKeto() as any);

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
    const svc = new AppService(hydra as any, makeKeto() as any);

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
    const svc = new AppService(hydra as any, keto as any);

    const out = await svc.acceptHydraConsent(user, { consent_challenge: 'cc', grant_scope: ['openid'] });

    expect(keto.checkApp).toHaveBeenCalledWith('u1', 'nova-id-test-app');
    expect(hydra.acceptConsent).not.toHaveBeenCalled();
    expect(hydra.rejectConsent).toHaveBeenCalledWith('cc', expect.objectContaining({ error: 'access_denied' }));
    expect(out.redirect_to).toBe('http://denied');
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
    const svc = new AppService(hydra as any, keto as any);

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
});
