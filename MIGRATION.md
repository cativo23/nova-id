# Migration: Military Ranks → Platform Roles

## Mapping

| Old (military) | New (platform)   |
|----------------|------------------|
| General        | platform_admin   |
| Colonel        | platform_admin   |
| Major          | platform_admin   |
| Captain        | platform_admin   |
| Lieutenant     | platform_user    |
| Sergeant       | platform_user    |
| Private        | platform_user    |
| Corporal       | platform_user    |

**Result**: Only two global roles:
- **platform_admin** – Admin dashboard, user management, all admin permissions
- **platform_user** – App access only; no admin permissions (default for new users)

---

## Files Modified

### Config & schema
- `config/kratos/identity.schema.json` – Trait **`role`** (replaces `rank`): enum `platform_user` | `platform_admin`, default `platform_user`
- `config/oathkeeper/access-rules.yml` – `X-User-Role` from `traits.role`; comments use "role"

### API (`api/src`)
- `app.controller.ts` – `/admin-demo` (platform_admin), `/user-demo` (authenticated)
- `app.service.ts` – `getAdminDemoData`, `getUserDemoData`
- `decorators/require-role.decorator.ts` – `RequireRole('platform_admin' | 'platform_user')`
- `guards/role.guard.ts` – `RoleGuard` (role check only)
- `guards/rank.guard.ts` – **Removed**
- `decorators/require-rank.decorator.ts` – **Removed**
- `logs/logs.controller.ts` – `RequireRole('platform_admin')`
- `interceptors/logging.interceptor.ts` – `user.role` in logs
- `logs/logs.service.ts` – `AccessLogEntry.user.role`

### Frontend (auth, admin, app)
- `**/utils/roleColors.js` – **New** (replaces `rankColors.js`): `getRoleColors`, `getRoleBadgeClass`
- `**/composables/useAuth.js` – `traits.role`, `syncRolePermissions`, `createUser` / `updateUser` use `role`
- `**/composables/useKeto.js` – `assignUserToRole`, `removeUserFromRole`, `getUserRole`
- `**/composables/usePermissions.js` – Comments use "role"
- `**/composables/usePermissionCache.js` – "role changes"
- `**/views/Registration.vue` – `traits.role`, `roleOptions`, default `platform_user`
- `frontend-admin` – `getUserRole`, `requiresPlatformAdmin`, `traits.role`, `editForm.role`, `addUserForm.role`
- `frontend-app` – `traits.role`, `apiResponse.user.role`

### Scripts
- `scripts/setup-all-permissions.sh` – `traits.role`; grant/assign for platform_admin | platform_user
- `scripts/assign-platform-admin-to-user.sh` – Updates `traits.role`, Keto role membership
- `scripts/create-user-via-api.sh` – `ROLE`, `traits.role`

### Docs
- `docs/AUTH_AND_RBAC.md` – Roles, `traits.role`, Keto namespaces
- `CREATE_USER_INSTRUCTIONS.md` – platform_admin, `assign-platform-admin-to-user.sh`
- `README.md` – Platform RBAC
- `api/README.md`, `api/SETUP.md` – admin-demo, user-demo, role-based access

---

## Oathkeeper

- **`/admin/**`**: requires `view_users` → platform_admin only.
- **`/api/*`**: public (`/health`, `/public`) or authenticated; protected API uses `X-User-Role` from `traits.role`.

---

## Checklist

- [x] Run `./scripts/setup-all-permissions.sh`
- [x] Data migration: Completed (migration scripts removed after completion)
- [x] Keto: `./scripts/clear-all-permissions.sh` then `./scripts/setup-all-permissions.sh`
- [x] Rebuild API, restart services
- [x] Migration testing: Completed

---

## Notes

- **Keto namespace `ranks`** remains for role membership (`ranks:platform_admin#member@user:ID`). Only platform roles are used.
- **Rank-specific code** (`rank.guard`, `require-rank`, `rankColors`, `traits.rank`) has been removed; use **roles** only.
