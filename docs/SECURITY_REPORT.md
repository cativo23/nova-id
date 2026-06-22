# Security Report: Nova ID

## 🔍 Resumen Ejecutivo

**Estado General de Seguridad: 7/10**

La arquitectura de Nova ID es robusta y sigue los principios de **Zero Trust**, centralizando la identidad y el acceso mediante el **Ory Stack** (Kratos, Hydra, Keto, Oathkeeper). La separación de responsabilidades es excelente y proporciona una base sólida para un sistema escalable y seguro.

Este reporte consolida hallazgos técnicos previos, descartando los ítems ya resueltos y priorizando las vulnerabilidades que aún requieren atención.

---

## 🏗️ Arquitectura de Seguridad

Nova ID utiliza un modelo de **Identity & Access Proxy (IAP)**:

- **Identity Management:** Ory Kratos gestiona el ciclo de vida de los usuarios.
- **Access Control:** Ory Oathkeeper actúa como el único punto de entrada (Gateway), validando sesiones y tokens.
- **Authorization:** Ory Keto aplica políticas de permisos granulares basándose en el modelo Google Zanzibar.
- **OAuth2/OIDC:** Ory Hydra permite que aplicaciones externas o internas obtengan acceso mediante flujos seguros (Auth Code + PKCE).

**Fortaleza Crítica:** La API de NestJS no gestiona sesiones; confía exclusivamente en las cabeceras inyectadas por Oathkeeper, simplificando la lógica de seguridad del backend.

---

## 🚨 Vulnerabilidades y Mejoras Pendientes

### Prioridad P0 – Crítico

#### 1. ✅ Clave Pública JWT Hardcodeada en API — Resuelto (PR #25)
- El `AuthenticatedGuard` ya no usa ninguna clave pública hardcodeada ni la variable `OAUTH_PUBLIC_KEY`. Verifica tokens contra el endpoint JWKS de Oathkeeper mediante `OAUTH_JWKS_URL`. Si `OAUTH_JWKS_URL` no está configurada, el guard lanza un error en el arranque. La rotación de la clave se recoge automáticamente vía JWKS (ver `docs/SECURITY_KEY_ROTATION.md`).

#### 2. ✅ Regla `internal-hydra-admin` expuesta con `noop` — Resuelto (PR #33)
- La regla fue eliminada de Oathkeeper. La API se comunica con Hydra Admin directamente por la red interna de Docker, y OAuth2-client CRUD se enruta vía BFF (PR #60).

#### 3. ✅ Configuración de CORS Excesivamente Permisiva — Resuelto (PR #33)
- La API usa una lista blanca estricta en `ALLOWED_ORIGINS`. Las cabeceras `X-User-*` no son aceptadas desde el cliente; sólo provienen del Proxy.

---

### Prioridad P1 – Alto

#### 4. ✅ Almacenamiento de Tokens en Frontend (SessionStorage) — Resuelto (PR #36 / BFF)
- Los tokens se manejan mediante el patrón BFF. El frontend-admin usa el BFF (`/v1/admin/*`) que opera con cookies `HttpOnly`/`Secure`; no hay tokens en sessionStorage.

#### 5. ✅ Exposición de Funciones Admin en Frontend-Auth — Resuelto (A1, PR #29)
- Las funciones de administración se movieron exclusivamente al `frontend-admin`. El `frontend-auth` se limita a login, registro y autoservicio.

#### 6. Falta de Rate Limiting — Abierto
- No hay límites de peticiones implementados en la API ni en el Gateway.
- **Acción pendiente:** Implementar `ThrottlerModule` en NestJS y configurar rate limiting en Oathkeeper.

---

### Prioridad P2 – Medio

#### 7. ✅ Kratos-Admin Direct Route — Resuelto (PR #33)
- La ruta directa a `kratos-admin` sin authz adecuada fue eliminada. El acceso a Kratos Admin va exclusivamente a través del BFF.

#### 8. ✅ PKCE Math.random + Open Redirect — Resuelto (PR #43)
- PKCE usa `crypto.getRandomValues` en lugar de `Math.random`. El open redirect en el flujo OAuth2 fue cerrado con validación de redirect_uri.

#### 9. ✅ Auditoría en Postgres — Resuelto (PR #35)
- La tabla de auditoría migró de SQLite a Postgres. El módulo de logs escribe eventos de acceso en `nova_audit` DB.

#### 10. ✅ Token Logging (Datos Sensibles en Logs) — Resuelto (PR #36)
- El logger del frontend fue actualizado para no incluir tokens, headers de identidad ni claims en los logs de producción.

#### 11. Protección de Escritura en Keto — Abierto
- La regla `keto-write` requiere sesión pero no un permiso específico de administración.
- **Acción pendiente:** Añadir un authorizer `remote_json` que exija `Platform:nova#administer` para realizar cambios en Keto.

#### 12. Health Checks y Observabilidad — Abierto
- **Acción pendiente:** Confirmar que los endpoints de salud no filtren información sensible; configurar métricas para monitorear intentos de login fallidos o errores de autorización.

---

## ✅ Ítems Resueltos (Vulnerabilidades Mitigadas)
*Los siguientes puntos han sido verificados en el código y ya no representan un riesgo abierto:*

- [x] **Unificación de Namespaces en Keto (OPL):** `Platform`/`App` en OPL (`namespaces.keto.ts`), `ranks`→`roles` migration completa (PR #27).
- [x] **Introspección de OAuth2 en Producción:** La regla `protected-api` soporta tokens Bearer mediante `oauth2_introspection`.
- [x] **Mutadores de Roles:** Los mutadores de Oathkeeper extraen el rol desde `metadata_public.role` correctamente (PR #27).
- [x] **Seguridad de Cookies:** `secure: true` configurado correctamente para entornos de producción.
- [x] **Hashing de Contraseñas:** Coste de Bcrypt adecuado (12) en producción para Ory Hydra.
- [x] **Secrets management:** Secretos via env vars sin fallback hardcodeado; `.env.production` en servidor, no en git (PR #26).
- [x] **CSP/HSTS headers:** Configurados en Traefik en producción (PR #33).
- [x] **Admin escalation paths (4 vías):** JWKS key rotated, `role` trait protegido (`ory:protected`), `keto-write` con authz, API port no expuesto (PR #25, #26, #27).

---

## 📋 Checklist de Seguridad Progresivo

- [x] **Secretos:** Sin valores `PLEASE-CHANGE-ME` en archivos YAML de producción (PR #26).
- [x] **Headers:** CSP (Content Security Policy) y HSTS en Traefik (PR #33).
- [x] **Validación:** Validación estricta de `issuer` y `audience` en la API.
- [x] **Limpieza:** `console.log` sensibles eliminados en builds de producción (PR #36).
- [ ] **Rate Limiting:** `ThrottlerModule` en NestJS + rate limiting en Oathkeeper. (open)
- [ ] **Keto write protection:** Authz admin-only en la regla `keto-write`. (open)
- [ ] **Observabilidad:** Métricas para login fallido / errores de autorización. (open)

---
*Este documento es la fuente oficial de seguridad para Nova ID. Debe actualizarse tras cada corrección crítica.*
