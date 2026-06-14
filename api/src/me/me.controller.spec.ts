import { Test } from '@nestjs/testing';
import { MeController } from './me.controller';
import { KetoService } from '../ory/keto.service';

describe('MeController', () => {
  let controller: MeController;
  const keto = { checkPlatform: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();
    const mod = await Test.createTestingModule({
      controllers: [MeController],
      providers: [{ provide: KetoService, useValue: keto }],
    }).compile();
    controller = mod.get(MeController);
  });

  it('returns resolved Platform flags + derived capabilities for the authed user', async () => {
    keto.checkPlatform.mockResolvedValue({ manage_users: true, administer: false });
    const res = await controller.permissions({ userId: 'abc' } as any);
    expect(keto.checkPlatform).toHaveBeenCalledWith('abc');
    expect(res).toMatchObject({
      userId: 'abc',
      manageUsers: true,
      administer: false,
      canViewUsers: true,
      canManageUsers: true,
      canManagePermissions: false,
      canAccessAdmin: false,
    });
  });
});
