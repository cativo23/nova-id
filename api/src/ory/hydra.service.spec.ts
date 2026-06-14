import { HydraService } from './hydra.service';

describe('HydraService', () => {
  it('acceptLogin delegates to OAuth2Api.acceptOAuth2LoginRequest with the challenge + body', async () => {
    const api = { acceptOAuth2LoginRequest: jest.fn().mockResolvedValue({ data: { redirect_to: 'http://x' } }) };
    const svc = new HydraService(api as any);

    const out = await svc.acceptLogin('chal-1', { subject: 'u1', remember: true });

    expect(api.acceptOAuth2LoginRequest).toHaveBeenCalledWith(expect.objectContaining({ loginChallenge: 'chal-1' }));
    expect(out.redirect_to).toBe('http://x');
  });

  it('acceptConsent delegates to OAuth2Api.acceptOAuth2ConsentRequest with the challenge + body', async () => {
    const api = { acceptOAuth2ConsentRequest: jest.fn().mockResolvedValue({ data: { redirect_to: 'http://y' } }) };
    const svc = new HydraService(api as any);

    const out = await svc.acceptConsent('chal-2', { grant_scope: ['openid'], remember: false });

    expect(api.acceptOAuth2ConsentRequest).toHaveBeenCalledWith(expect.objectContaining({ consentChallenge: 'chal-2' }));
    expect(out.redirect_to).toBe('http://y');
  });
});
