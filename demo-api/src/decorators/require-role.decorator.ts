import { SetMetadata } from "@nestjs/common";

export const ROLE_KEY = "role";
export type PlatformRole = "platform_admin" | "platform_user";

/** Require platform_admin (bootstrap endpoint) or platform_user (general access). */
export const RequireRole = (role: PlatformRole) => SetMetadata(ROLE_KEY, role);
