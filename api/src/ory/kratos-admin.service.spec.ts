import { KratosAdminService } from './kratos-admin.service';

function makeService(identityApiMock: any): KratosAdminService {
  return new KratosAdminService(identityApiMock);
}

describe('KratosAdminService', () => {
  it('listIdentities delegates to IdentityApi and returns identities', async () => {
    const fakeIdentities = [{ id: 'abc', traits: { email: 'a@b.c', full_name: 'A' } }];
    const api = { listIdentities: jest.fn().mockResolvedValue({ data: fakeIdentities }) };
    const svc = makeService(api);

    const result = await svc.listIdentities({ pageSize: 50 });

    expect(api.listIdentities).toHaveBeenCalledWith(expect.objectContaining({ pageSize: 50 }));
    expect(result).toEqual(fakeIdentities);
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
});
