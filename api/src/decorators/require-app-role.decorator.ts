import { SetMetadata } from '@nestjs/common';

export const REQUIRE_APP_ROLE_KEY = 'requireAppRole';
export const RequireAppRole = (role: 'app_admin' | 'app_user') =>
  SetMetadata(REQUIRE_APP_ROLE_KEY, role);
