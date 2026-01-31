import { SetMetadata } from '@nestjs/common';

export const ROLE_KEY = 'role';
export type PlatformRole = 'platform_admin' | 'platform_user';

/** Require platform_admin (admin dashboard, user mgmt) or platform_user (app access only). */
export const RequireRole = (role: PlatformRole) => SetMetadata(ROLE_KEY, role);
