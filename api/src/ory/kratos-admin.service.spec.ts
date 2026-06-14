import { ConflictException, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { KratosAdminService } from './kratos-admin.service';

function makeService(identityApiMock: any): KratosAdminService {
  return new KratosAdminService(identityApiMock);
}

function axiosErr(status: number): Error {
  const e: any = new Error(`HTTP ${status}`);
  e.response = { status };
  return e;
}

describe('KratosAdminService', () => {
  it('listIdentities delegates to IdentityApi and returns { identities, nextPageToken }', async () => {
    const fakeIdentities = [{ id: 'abc', traits: { email: 'a@b.c', full_name: 'A' } }];
    const api = { listIdentities: jest.fn().mockResolvedValue({ data: fakeIdentities, headers: {} }) };
    const svc = makeService(api);

    const result = await svc.listIdentities({ pageSize: 50 });

    expect(api.listIdentities).toHaveBeenCalledWith(expect.objectContaining({ pageSize: 50 }));
    expect(result).toEqual({ identities: fakeIdentities, nextPageToken: null });
  });

  it('createIdentity sends email+full_name traits, password credential, and metadata_public.role', async () => {
    const api = { createIdentity: jest.fn().mockResolvedValue({ data: { id: 'new' } }) };
    const svc = makeService(api);

    await svc.createIdentity({ email: 'a@b.c', fullName: 'A B', password: 'Cacpac2323$', role: 'platform_user' });

    const arg = api.createIdentity.mock.calls[0][0].createIdentityBody;
    expect(arg.traits).toEqual({ email: 'a@b.c', full_name: 'A B' });
    expect(arg.credentials.password.config.password).toBe('Cacpac2323$');
    expect(arg.metadata_public).toEqual({ role: 'platform_user' });
  });

  it('createRecoveryLink delegates and returns the recovery_link', async () => {
    const api = { createRecoveryLinkForIdentity: jest.fn().mockResolvedValue({ data: { recovery_link: 'http://x/recover' } }) };
    const svc = makeService(api);

    const link = await svc.createRecoveryLink('id-1');

    expect(api.createRecoveryLinkForIdentity).toHaveBeenCalled();
    expect(link).toBe('http://x/recover');
  });

  it('updateIdentity merges traits and falls back to the current role when none is given', async () => {
    const current = {
      id: 'u1',
      schema_id: 'default',
      traits: { email: 'old@b.c', full_name: 'Old' },
      metadata_public: { role: 'platform_admin' },
      state: 'active',
    };
    const api = {
      getIdentity: jest.fn().mockResolvedValue({ data: current }),
      updateIdentity: jest.fn().mockResolvedValue({ data: { id: 'u1' } }),
    };
    const svc = makeService(api);

    await svc.updateIdentity('u1', { fullName: 'New Name' }); // no email, no role

    expect(api.getIdentity).toHaveBeenCalledWith({ id: 'u1' });
    const body = api.updateIdentity.mock.calls[0][0].updateIdentityBody;
    expect(body.traits).toEqual({ email: 'old@b.c', full_name: 'New Name' });
    expect(body.metadata_public).toEqual({ role: 'platform_admin' }); // fell back to current
    expect(body.state).toBe('active');
  });

  it('setIdentityState fetches the identity and updates only its state', async () => {
    const current = {
      id: 'u2',
      schema_id: 'default',
      traits: { email: 'a@b.c', full_name: 'A' },
      metadata_public: { role: 'platform_user' },
      state: 'active',
    };
    const api = {
      getIdentity: jest.fn().mockResolvedValue({ data: current }),
      updateIdentity: jest.fn().mockResolvedValue({ data: { id: 'u2', state: 'inactive' } }),
    };
    const svc = makeService(api);

    await svc.setIdentityState('u2', 'inactive');

    expect(api.getIdentity).toHaveBeenCalledWith({ id: 'u2' });
    const body = api.updateIdentity.mock.calls[0][0].updateIdentityBody;
    expect(body.state).toBe('inactive');
    expect(body.traits).toEqual(current.traits);
  });

  // Error mapping tests (Fix #1)
  describe('error mapping', () => {
    it('getIdentity 404 → NotFoundException', async () => {
      const api = { getIdentity: jest.fn().mockRejectedValue(axiosErr(404)) };
      const svc = makeService(api);
      await expect(svc.getIdentity('missing-id')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('createIdentity 409 → ConflictException', async () => {
      const api = { createIdentity: jest.fn().mockRejectedValue(axiosErr(409)) };
      const svc = makeService(api);
      await expect(
        svc.createIdentity({ email: 'dup@b.c', fullName: 'D', password: 'Pw123456$' }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('createIdentity 400 (duplicate credentials) → ConflictException', async () => {
      const api = { createIdentity: jest.fn().mockRejectedValue(axiosErr(400)) };
      const svc = makeService(api);
      await expect(
        svc.createIdentity({ email: 'dup@b.c', fullName: 'D', password: 'Pw123456$' }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('deleteIdentity 404 → NotFoundException', async () => {
      const api = { deleteIdentity: jest.fn().mockRejectedValue(axiosErr(404)) };
      const svc = makeService(api);
      await expect(svc.deleteIdentity('gone-id')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('getIdentity generic error → InternalServerErrorException', async () => {
      const api = { getIdentity: jest.fn().mockRejectedValue(new Error('ECONNREFUSED')) };
      const svc = makeService(api);
      await expect(svc.getIdentity('u1')).rejects.toBeInstanceOf(InternalServerErrorException);
    });

    it('createIdentity generic error → InternalServerErrorException', async () => {
      const api = { createIdentity: jest.fn().mockRejectedValue(new Error('network fail')) };
      const svc = makeService(api);
      await expect(
        svc.createIdentity({ email: 'x@b.c', fullName: 'X', password: 'Pw123456$' }),
      ).rejects.toBeInstanceOf(InternalServerErrorException);
    });
  });

  // Pagination (Fix #6) — listIdentities returns { identities, nextPageToken }
  describe('listIdentities pagination', () => {
    it('returns identities and null nextPageToken when no Link header', async () => {
      const fakeIdentities = [{ id: '1' }];
      const api = {
        listIdentities: jest.fn().mockResolvedValue({ data: fakeIdentities, headers: {} }),
      };
      const svc = makeService(api);
      const result = await svc.listIdentities({ pageSize: 50 });
      expect(result).toEqual({ identities: fakeIdentities, nextPageToken: null });
    });

    it('parses page_token from Link header rel="next"', async () => {
      const fakeIdentities = [{ id: '1' }];
      const linkHeader = '<http://kratos/admin/identities?page_token=tok123&page_size=100>; rel="next"';
      const api = {
        listIdentities: jest.fn().mockResolvedValue({ data: fakeIdentities, headers: { link: linkHeader } }),
      };
      const svc = makeService(api);
      const result = await svc.listIdentities({ pageSize: 100 });
      expect(result.nextPageToken).toBe('tok123');
    });

    it('returns null nextPageToken when Link header has no rel=next', async () => {
      const linkHeader = '<http://kratos/admin/identities?page_token=tok0&page_size=100>; rel="prev"';
      const api = {
        listIdentities: jest.fn().mockResolvedValue({ data: [], headers: { link: linkHeader } }),
      };
      const svc = makeService(api);
      const result = await svc.listIdentities({});
      expect(result.nextPageToken).toBeNull();
    });

    it('passes pageToken to the SDK call', async () => {
      const api = {
        listIdentities: jest.fn().mockResolvedValue({ data: [], headers: {} }),
      };
      const svc = makeService(api);
      await svc.listIdentities({ pageToken: 'cursor-abc' });
      expect(api.listIdentities).toHaveBeenCalledWith(expect.objectContaining({ pageToken: 'cursor-abc' }));
    });
  });
});
