import { Test } from '@nestjs/testing';
import { AdminUsersController } from './admin-users.controller';
import { KratosAdminService } from '../ory/kratos-admin.service';
import { PlatformManageUsersGuard } from '../guards/platform-manage-users.guard';

const fakeIdentity = (id: string) => ({
  id,
  traits: { email: `${id}@b.c`, full_name: 'Test User' },
  metadata_public: { role: 'platform_user' },
  state: 'active',
  created_at: '2024-01-01T00:00:00.000Z',
});

describe('AdminUsersController', () => {
  let controller: AdminUsersController;
  const kratos = {
    listIdentities: jest.fn(),
    getIdentity: jest.fn(),
    createIdentity: jest.fn(),
    updateIdentity: jest.fn(),
    setIdentityState: jest.fn(),
    deleteIdentity: jest.fn(),
    createRecoveryLink: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const mod = await Test.createTestingModule({
      controllers: [AdminUsersController],
      providers: [{ provide: KratosAdminService, useValue: kratos }],
    })
      .overrideGuard(PlatformManageUsersGuard)
      .useValue({ canActivate: () => true })
      .compile();
    controller = mod.get(AdminUsersController);
  });

  it('GET list maps identities to paginated envelope', async () => {
    kratos.listIdentities.mockResolvedValue({
      identities: [fakeIdentity('1')],
      nextPageToken: null,
    });
    const res = await controller.list({ pageSize: 50 });
    expect(res.data[0]).toMatchObject({ id: '1', email: '1@b.c', fullName: 'Test User', role: 'platform_user' });
    expect(res.nextPageToken).toBeNull();
  });

  it('GET list forwards nextPageToken from service', async () => {
    kratos.listIdentities.mockResolvedValue({
      identities: [fakeIdentity('2')],
      nextPageToken: 'cursor-xyz',
    });
    const res = await controller.list({ pageSize: 100, pageToken: 'prev-cursor' });
    expect(kratos.listIdentities).toHaveBeenCalledWith(expect.objectContaining({ pageToken: 'prev-cursor' }));
    expect(res.nextPageToken).toBe('cursor-xyz');
  });

  it('GET :id delegates to getIdentity and returns UserResponseDto', async () => {
    kratos.getIdentity.mockResolvedValue(fakeIdentity('u5'));
    const res = await controller.get('u5');
    expect(kratos.getIdentity).toHaveBeenCalledWith('u5');
    expect(res).toMatchObject({ id: 'u5', email: 'u5@b.c' });
  });

  it('POST create delegates to KratosAdminService.createIdentity', async () => {
    kratos.createIdentity.mockResolvedValue(fakeIdentity('new'));
    await controller.create({ email: 'n@b.c', fullName: 'N', password: 'Cacpac2323$' } as any);
    expect(kratos.createIdentity).toHaveBeenCalledWith(expect.objectContaining({ email: 'n@b.c', fullName: 'N' }));
  });

  it('PATCH :id delegates to updateIdentity and returns UserResponseDto', async () => {
    kratos.updateIdentity.mockResolvedValue({ ...fakeIdentity('u3'), traits: { email: 'new@b.c', full_name: 'New' } });
    const res = await controller.update('u3', { email: 'new@b.c' } as any);
    expect(kratos.updateIdentity).toHaveBeenCalledWith('u3', expect.objectContaining({ email: 'new@b.c' }));
    expect(res.email).toBe('new@b.c');
  });

  it('PATCH :id/state delegates to setIdentityState and returns UserResponseDto', async () => {
    kratos.setIdentityState.mockResolvedValue({ ...fakeIdentity('u4'), state: 'inactive' });
    const res = await controller.setState('u4', { state: 'inactive' });
    expect(kratos.setIdentityState).toHaveBeenCalledWith('u4', 'inactive');
    expect(res.state).toBe('inactive');
  });

  it('POST :id/recovery-link delegates to createRecoveryLink and returns recovery_link', async () => {
    kratos.createRecoveryLink.mockResolvedValue('http://recover/link');
    const res = await controller.recoveryLink('u6');
    expect(kratos.createRecoveryLink).toHaveBeenCalledWith('u6');
    expect(res).toEqual({ recovery_link: 'http://recover/link' });
  });

  it('DELETE delegates to deleteIdentity', async () => {
    kratos.deleteIdentity.mockResolvedValue(undefined);
    await controller.remove('id-9');
    expect(kratos.deleteIdentity).toHaveBeenCalledWith('id-9');
  });
});
