import { NotFoundException, ConflictException, InternalServerErrorException } from '@nestjs/common';
import { HydraService } from './hydra.service';

function axiosErr(status: number) {
  return { response: { status }, message: 'boom' } as unknown;
}

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

  it('acceptLogin preserves session.id_token through the SDK type-cast', async () => {
    // Verifies that the AcceptOAuth2LoginRequestWithSession cast does not drop
    // id_token — the Oathkeeper id_token mutator depends on this field being forwarded.
    const api = { acceptOAuth2LoginRequest: jest.fn().mockResolvedValue({ data: { redirect_to: 'http://z' } }) };
    const svc = new HydraService(api as any);

    await svc.acceptLogin('chal-3', { subject: 'u1', session: { id_token: { role: 'platform_admin' } } });

    const passedBody = api.acceptOAuth2LoginRequest.mock.calls[0][0].acceptOAuth2LoginRequest;
    expect(passedBody.session?.id_token).toEqual({ role: 'platform_admin' });
  });
});

describe('getLoginRequest', () => {
  it('delegates to OAuth2Api.getOAuth2LoginRequest and returns data', async () => {
    const api = { getOAuth2LoginRequest: jest.fn().mockResolvedValue({ data: { challenge: 'c1', skip: true, subject: 'u1' } }) };
    const svc = new HydraService(api as any);

    const out = await svc.getLoginRequest('c1');

    expect(api.getOAuth2LoginRequest).toHaveBeenCalledWith({ loginChallenge: 'c1' });
    expect(out.skip).toBe(true);
    expect(out.subject).toBe('u1');
  });
});

describe('getConsentRequest', () => {
  it('delegates to OAuth2Api.getOAuth2ConsentRequest and returns data', async () => {
    const api = {
      getOAuth2ConsentRequest: jest.fn().mockResolvedValue({
        data: { challenge: 'c2', client: { client_id: 'nova-id-test-app' }, requested_access_token_audience: ['aud1'] },
      }),
    };
    const svc = new HydraService(api as any);

    const out = await svc.getConsentRequest('c2');

    expect(api.getOAuth2ConsentRequest).toHaveBeenCalledWith({ consentChallenge: 'c2' });
    expect(out.client?.client_id).toBe('nova-id-test-app');
    expect(out.requested_access_token_audience).toEqual(['aud1']);
  });
});

describe('listClients pagination', () => {
  it('forwards pageSize/pageToken and returns null nextPageToken when there is no Link header', async () => {
    const clients = [{ client_id: 'c1' }];
    const api = { listOAuth2Clients: jest.fn().mockResolvedValue({ data: clients, headers: {} }) };
    const svc = new HydraService(api as any);

    const result = await svc.listClients({ pageSize: 50 });

    expect(api.listOAuth2Clients).toHaveBeenCalledWith(expect.objectContaining({ pageSize: 50 }));
    expect(result).toEqual({ clients, nextPageToken: null });
  });

  it('parses page_token from the Link header rel="next" entry', async () => {
    const linkHeader = '<http://hydra/admin/clients?page_token=tok123>; rel="next"';
    const api = {
      listOAuth2Clients: jest.fn().mockResolvedValue({ data: [], headers: { link: linkHeader } }),
    };
    const svc = new HydraService(api as any);

    const result = await svc.listClients({ pageSize: 100 });

    expect(result.nextPageToken).toBe('tok123');
  });

  it('passes pageToken through to the SDK call', async () => {
    const api = { listOAuth2Clients: jest.fn().mockResolvedValue({ data: [], headers: {} }) };
    const svc = new HydraService(api as any);

    await svc.listClients({ pageToken: 'cursor-abc' });

    expect(api.listOAuth2Clients).toHaveBeenCalledWith(expect.objectContaining({ pageToken: 'cursor-abc' }));
  });
});

describe('HydraService client CRUD error classification', () => {
  it('getClient: 404 → NotFoundException', async () => {
    const api = { getOAuth2Client: jest.fn().mockRejectedValue(axiosErr(404)) };
    const svc = new HydraService(api as any);

    await expect(svc.getClient('missing')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('createClient: 409 → ConflictException', async () => {
    const api = { createOAuth2Client: jest.fn().mockRejectedValue(axiosErr(409)) };
    const svc = new HydraService(api as any);

    await expect(svc.createClient({} as any)).rejects.toBeInstanceOf(ConflictException);
  });

  it('createClient: 400 → ConflictException', async () => {
    const api = { createOAuth2Client: jest.fn().mockRejectedValue(axiosErr(400)) };
    const svc = new HydraService(api as any);

    await expect(svc.createClient({} as any)).rejects.toBeInstanceOf(ConflictException);
  });

  it('updateClient: 404 while fetching current client → NotFoundException', async () => {
    const api = { getOAuth2Client: jest.fn().mockRejectedValue(axiosErr(404)) };
    const svc = new HydraService(api as any);

    await expect(svc.updateClient('missing', {})).rejects.toBeInstanceOf(NotFoundException);
  });

  it('deleteClient: 404 → NotFoundException', async () => {
    const api = { deleteOAuth2Client: jest.fn().mockRejectedValue(axiosErr(404)) };
    const svc = new HydraService(api as any);

    await expect(svc.deleteClient('missing')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('any other status → InternalServerErrorException, never a bare 500 leak', async () => {
    const api = { getOAuth2Client: jest.fn().mockRejectedValue(axiosErr(503)) };
    const svc = new HydraService(api as any);

    await expect(svc.getClient('x')).rejects.toBeInstanceOf(InternalServerErrorException);
  });
});

describe('updateClient', () => {
  it('fetches the current client and merges the partial body so omitted fields survive Hydra\'s full-replace PUT', async () => {
    const current = {
      client_id: 'app-1',
      client_name: 'Old Name',
      redirect_uris: ['https://app.example/callback'],
      grant_types: ['authorization_code'],
      scope: 'openid profile',
    };
    const api = {
      getOAuth2Client: jest.fn().mockResolvedValue({ data: current }),
      setOAuth2Client: jest.fn().mockResolvedValue({ data: { ...current, client_name: 'New Name' } }),
    };
    const svc = new HydraService(api as any);

    const out = await svc.updateClient('app-1', { client_name: 'New Name' });

    expect(api.getOAuth2Client).toHaveBeenCalledWith({ id: 'app-1' });
    expect(api.setOAuth2Client).toHaveBeenCalledWith({
      id: 'app-1',
      oAuth2Client: expect.objectContaining({
        client_name: 'New Name',
        redirect_uris: ['https://app.example/callback'],
        grant_types: ['authorization_code'],
        scope: 'openid profile',
      }),
    });
    expect(out.client_name).toBe('New Name');
  });

  it('replaces (not merges) an array field when the patch supplies a new array', async () => {
    const current = {
      client_id: 'app-2',
      redirect_uris: ['https://old.example/callback'],
      grant_types: ['authorization_code'],
    };
    const api = {
      getOAuth2Client: jest.fn().mockResolvedValue({ data: current }),
      setOAuth2Client: jest.fn().mockResolvedValue({ data: current }),
    };
    const svc = new HydraService(api as any);

    await svc.updateClient('app-2', { redirect_uris: ['https://new.example/callback'] });

    const merged = api.setOAuth2Client.mock.calls[0][0].oAuth2Client;
    expect(merged.redirect_uris).toEqual(['https://new.example/callback']);
    expect(merged.grant_types).toEqual(['authorization_code']);
  });
});

describe('rejectConsent', () => {
  it('delegates to OAuth2Api.rejectOAuth2ConsentRequest with the error body', async () => {
    const api = { rejectOAuth2ConsentRequest: jest.fn().mockResolvedValue({ data: { redirect_to: 'http://denied' } }) };
    const svc = new HydraService(api as any);

    const out = await svc.rejectConsent('c3', { error: 'access_denied', error_description: 'not a member' });

    expect(api.rejectOAuth2ConsentRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        consentChallenge: 'c3',
        rejectOAuth2Request: expect.objectContaining({ error: 'access_denied' }),
      }),
    );
    expect(out.redirect_to).toBe('http://denied');
  });
});
