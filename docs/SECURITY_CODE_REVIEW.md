# Code Review: Ory Stack, OAuth2/OIDC, Seguridad y User Management

**Revisión por componente, priorizada de mayor a menor criticidad.**  
Basada en estándares Ory, OAuth 2.0/OIDC (RFC/OIDC Core), OWASP y buenas prácticas de industria.

---

## Referencias de buenas prácticas utilizadas

| Área | Fuente | Enlace / Nota |
|------|--------|----------------|
| **Oathkeeper** | Ory Docs | [Authenticators](https://www.ory.sh/docs/oathkeeper/pipeline/authn): `noop` = allow-all; usar solo cuando el upstream controla acceso. No exponer APIs administrativas con `noop`. |
| **Oathkeeper** | Ory Docs | Múltiples authenticators por regla: el primero que pueda manejar las credenciales se usa (ej. `cookie_session` + `oauth2_introspection`). |
| **Kratos** | Ory Docs | [Go to production](https://www.ory.sh/docs/kratos/guides/production): nunca exponer Admin API a internet; Zero Trust; secretos por variables de entorno; omitir `--dev` en producción. |
| **Kratos** | Ory Docs | Secretos: `secrets.cookie` y `secrets.cipher`; preferir env vars (ej. `SECRETS_DEFAULT` o paths anidados con `_`). |
| **Hydra** | Ory Docs | [Prepare for production](https://www.ory.sh/docs/hydra/self-hosted/production): puerto administrativo (4445) **no** debe exponerse a internet; colocar detrás de API Gateway; TLS en el edge. |
| **Hydra** | Ory Docs | Administrative endpoints no tienen access control built-in; restringir con API Gateway o Authorization Proxy. |
| **OAuth2/OIDC SPA** | Auth0 / Curity | [Token Storage](https://auth0.com/docs/secure/security-guidance/data-security/token-storage): BFF preferido; si no, sessionStorage mejor que localStorage; PKCE + Authorization Code obligatorio para clientes públicos. |
| **API Backend** | OWASP / Guisso | No confiar en headers entrantes por defecto; solo confiar en headers inyectados por un proxy de confianza cuando la API **solo** es accesible a través de ese proxy. |
| **Keto** | Ory Docs | [Namespaces](https://www.ory.sh/docs/keto/concepts/namespaces): nombres singulares/upper camel; relaciones en plural ("members", "writers"); un solo modelo de membership por dominio. |

---

## Resumen ejecutivo

| Prioridad | Cantidad | Enfoque |
|-----------|----------|---------|
| **P0 – Crítico** | 8 | Seguridad inmediata, secretos, acceso no autorizado |
| **P1 – Alto** | 10 | Configuración producción, consistencia, OAuth/OIDC |
| **P2 – Medio** | 9 | Hardening, validación, observabilidad |
| **P3 – Bajo** | 7 | Limpieza, documentación, deuda técnica |

---

# 1. Oathkeeper (API Gateway)

## P0 – Crítico

### 1.1 Regla `internal-hydra-admin` sin autenticación (local)

**Archivo:** `config/oathkeeper/rules.local.json`  
**Problema:** La regla `internal-hydra-admin` usa `handler: noop` en authenticators. Cualquier cliente que alcance `api.ory.localhost/api/internal/hydra-admin/*` puede llamar a la Hydra Admin API (crear/eliminar clientes OAuth2, aceptar consent, etc.) sin autenticación.

**Buenas prácticas (referencias):** Ory Oathkeeper: *"Using [noop] is basically an allow-all configuration. It makes sense when the upstream handles access control itself."* ([Authenticators](https://www.ory.sh/docs/oathkeeper/pipeline/authn)). Ory Hydra: *"The administrative port shouldn't be exposed to public internet traffic. None of the administrative endpoints have any built-in access control."* ([Prepare for production](https://www.ory.sh/docs/hydra/self-hosted/production)).

**Acción:**
- No exponer la ruta `/api/internal/hydra-admin` al público. Si la API debe llamar a Hydra Admin, hacerlo **directamente** a `http://hydra:4445` desde el backend (misma red Docker), sin pasar por Oathkeeper.
- En `api`: configurar `HYDRA_ADMIN_URL=http://hydra:4445` para llamadas server-side y eliminar la regla `internal-hydra-admin` de Oathkeeper, o restringirla a una red/virtual host interno y añadir autenticación (ej. API key o mTLS) si se mantiene.

**Ajuste aplicado:** OPERATIONS.md y `.env.example` documentan que la API debe usar `HYDRA_ADMIN_URL` apuntando a Hydra por red interna (p. ej. `http://hydra:4445`).

### 1.2 Authorizer inexistente `remote_json_rate_limit`

**Archivo:** `config/oathkeeper/access-rules.yml` (regla `protected-api`)  
**Problema:** Se usa `handler: remote_json_rate_limit`, que **no está definido** en `oathkeeper.config.yaml` ni en los overrides. Oathkeeper no incluye ese authorizer por defecto; la regla fallaría si se usara este archivo.

**Acción:**
- Si usas `access-rules.yml`: cambiar a `handler: allow` (o el authorizer que realmente uses) y documentar que el rate limiting se hará en otro nivel (nginx, API, servicio dedicado).
- Si no usas `access-rules.yml`: aclarar en docs qué archivo de reglas es la fuente de verdad (p. ej. `rules.local.json` / `rules.production.json`) y considerar deprecar o regenerar `access-rules.yml` para evitar confusión.

## P1 – Alto

### 1.3 Producción: Protected API sin soporte Bearer (OAuth2)

**Archivo:** `config/oathkeeper/rules.production.json`  
**Problema:** La regla `protected-api` solo tiene `cookie_session` como authenticator. No hay `oauth2_introspection`. En producción, clientes que usen solo Bearer token (SPA, móvil, integraciones) no podrán acceder a la API protegida.

**Buenas prácticas (referencias):** Ory Oathkeeper: puedes definir **varios authenticators** por regla; el primero que pueda manejar las credenciales se usa ([Authenticators](https://www.ory.sh/docs/oathkeeper/pipeline/authn)). Para APIs que atiendan tanto sesión web (cookie) como clientes OAuth2 (Bearer), es correcto listar `cookie_session` y `oauth2_introspection`.

**Acción:**
- Añadir el authenticator `oauth2_introspection` en la regla `protected-api` de producción (igual que en `rules.local.json`), manteniendo `cookie_session` como primera opción para sesión web.

### 1.4 Inconsistencia Keto: namespace `roles` vs `ranks`

**Archivos:** `config/oathkeeper/rules.local.json` (frontend-admin), `config/oathkeeper/rules.production.json`, `scripts/setup-all-permissions.sh`, `config/oathkeeper/access-rules.yml` (keto-protected-api)  
**Problema:**
- El script y la doc usan **ranks** para membresía: `ranks:platform_admin#member@user:<id>`.
- Las reglas de Oathkeeper para frontend-admin y keto-protected-api usan **roles** y relación **members**: `roles:platform_admin#members`.
- Keto tiene ambos namespaces (`ranks` y `roles`), pero el setup solo crea tuplas en `ranks`. Si no se crean tuplas en `roles`, el acceso a admin puede denegarse o depender de datos duplicados.

**Acción:**
- Unificar en un solo modelo: usar **ranks** + relación **member** en todas las reglas de Oathkeeper que comprueben “usuario es platform_admin”.
- En `rules.local.json` y `rules.production.json`, en la regla frontend-admin (y cualquier otra que compruebe admin), usar payload tipo:  
  `{"namespace":"ranks","object":"platform_admin","relation":"member","subject_id":"user:{{ print .Subject }}"}`.
- En `access-rules.yml`, regla `keto-protected-api`, corregir el payload de `roles`/`members` a `ranks`/`member` y alinear con la doc (AUTH_AND_RBAC.md).

## P2 – Medio

### 1.5 Mutator id_token: claim `role` desde `rank` en access-rules

**Archivo:** `config/oathkeeper/access-rules.yml` (protected-api, keto-protected-api)  
**Problema:** En los mutadores id_token se usa `"role": "{{ print .Extra.identity.traits.rank }}"` (protected-api) y `"role": "platform_admin"` fijo (keto-protected-api). El schema de Kratos usa `traits.role`, no `traits.rank`.

**Acción:**
- Usar `traits.role` en los mutators: `"role": "{{ print .Extra.identity.traits.role }}"` y quitar el valor fijo en keto-protected-api para reflejar la identidad real.

### 1.6 Regla `hydra-direct` expone Hydra sin gateway

**Archivo:** `config/oathkeeper/access-rules.yml`  
**Problema:** La regla `hydra-direct` permite acceso a `http://localhost:4444` sin autenticación. En entornos donde el puerto esté accesible, se evita el gateway.

**Acción:**
- Usar solo en desarrollo local y documentar que no debe estar activa en staging/producción. Mejor: no cargar esta regla en producción (p. ej. no incluirla en `rules.production.json`).

---

# 2. Ory Kratos (Identidad)

## P0 – Crítico

### 2.1 Secretos por defecto en configuración local

**Archivos:** `config/kratos/kratos.config.yaml`, `config/kratos/kratos.local.yml`  
**Problema:** Valores como `PLEASE-CHANGE-ME-I-AM-VERY-INSECURE` y `32-LONG-SECRET-NOT-SECURE-AT-ALL` en cookie/cipher. Si estos archivos se usan en algún entorno compartido o no local, las sesiones y datos cifrados quedan comprometidos.

**Buenas prácticas (referencias):** Ory Kratos: *"Use environment variables to prevent secrets from leaking in configuration files"*; paths anidados se mapean a env vars con `_` (ej. `secrets.cookie` → `SECRETS_COOKIE`) ([Configure Ory Kratos](https://www.ory.sh/docs/kratos/configuring)). [Go to production](https://www.ory.sh/docs/kratos/guides/production): omitir `--dev` y no exponer Admin API.

**Acción:**
- En local: inyectar secretos por variables de entorno (igual que en producción) y no commitear valores reales. En `.env.example` documentar que en local también deben definirse `KRATOS_SECRETS_COOKIE` y `KRATOS_SECRETS_CIPHER` (o equivalentes) y que los valores por defecto del repo son solo placeholders.

### 2.2 Logs con datos sensibles en local

**Archivos:** `config/kratos/kratos.config.yaml`, `config/kratos/kratos.local.yml`  
**Problema:** `leak_sensitive_values: true` hace que Kratos incluya valores sensibles en logs. Aceptable solo en máquinas de desarrollo aisladas.

**Acción:**
- Dejar `leak_sensitive_values: false` en cualquier entorno no estrictamente local y documentar que en local solo debe activarse con conocimiento del riesgo. Revisar que en producción esté en `false` (en kratos.production.yml ya está correcto).

## P1 – Alto

### 2.3 HaveIBeenPwned deshabilitado en local

**Archivos:** `config/kratos/kratos.local.yml`, `config/kratos/kratos.config.yaml`  
**Problema:** `haveibeenpwned_enabled: false` debilita la política de contraseñas. Correcto para dev; peligroso si se usa el mismo config en staging.

**Acción:**
- Asegurar que en staging/producción se use siempre un config con `haveibeenpwned_enabled: true` (como en kratos.production.yml). Documentar en GETTING_STARTED o OPERATIONS que el config “local” no debe usarse fuera de desarrollo.

### 2.4 Session lifespan 720h (30 días)

**Archivos:** `config/kratos/kratos.*.yml`  
**Problema:** 30 días sin re-autenticación puede ser excesivo para aplicaciones sensibles (admin, datos personales).

**Acción:**
- Valorar reducir a 24–168 h (1–7 días) según política de la organización, o usar AAL/privileged session para operaciones sensibles (ya usas `privileged_session_max_age: 15m` en settings, está bien). Documentar la decisión de lifespan en AUTH_AND_RBAC o OPERATIONS.

## P2 – Medio

### 2.5 Cookie sin `Secure` en producción (Kratos)

**Archivo:** `config/kratos/kratos.production.yml`  
**Revisión:** Tienes `secure: true` en la sección cookies; correcto. Solo asegurar que no se sobrescriba en otros overlays y que el dominio (`cativo.dev`) sea el esperado.

### 2.6 Allowed return URLs

**Archivos:** `config/kratos/kratos.local.yml`, `config/kratos/kratos.production.yml`  
**Acción:** Revisar periódicamente que `allowed_return_urls` solo incluya orígenes que controlas (frontends y gateway). Cualquier URL añadida puede usarse en redirects post-login/registro/verificación.

---

# 3. Ory Hydra (OAuth2/OIDC)

## P0 – Crítico

### 3.1 Secretos de Hydra

**Archivos:** `config/hydra/hydra.config.yaml`, overrides  
**Problema:** En base config, `secrets.system` usa `${HYDRA_SECRETS_SYSTEM}`; en hydra.local.yml se usa `${HYDRA_SYSTEM_SECRET}`. Nombre de variable inconsistente y riesgo si en algún entorno no se define.

**Acción:**
- Unificar nombre de variable (p. ej. `HYDRA_SYSTEM_SECRET`) en todos los entornos y documentarlo en `.env.example`. Asegurar que en producción el valor sea fuerte (min 32 bytes, aleatorio) y que no se use el mismo valor que en dev.

## P1 – Alto

### 3.2 Exposición de errores internos en local

**Archivo:** `config/hydra/hydra.local.yml`  
**Problema:** `oauth2.expose_internal_errors: true` puede filtrar detalles de implementación. Aceptable solo en dev.

**Acción:**
- Confirmar que en producción (hydra.production.yml) está en `false`. En local, documentar que no debe activarse en ningún entorno compartido.

### 3.3 Coste bcrypt en Hydra (local)

**Archivos:** `config/hydra/hydra.local.yml`, `config/hydra/hydra.config.yaml`  
**Problema:** cost 8 está bien para dev; en producción debe ser mayor (p. ej. 12, como en hydra.production.yml). Ya está correcto en producción; solo asegurar que ningún otro override baje el cost en prod.

### 3.4 PKCE y flujo Authorization Code

**Archivo:** `frontend-app/src/composables/useHydraOAuth.js`  
**Buenas prácticas:** Se usa PKCE (S256), state y Authorization Code; correcto para un cliente público (SPA).  
**Acción:** Asegurar que los clientes OAuth2 de Hydra para SPAs tengan `token_endpoint_auth_method: none` (o equivalente) y que `redirect_uri` esté fijo y validado; no confiar en redirect_uri dinámicos desde el cliente.

## P2 – Medio

### 3.5 TTL de tokens

**Archivos:** `config/hydra/hydra.*.yml`  
**Valores actuales:** access_token 1h, refresh 720h, id_token 1h, auth_code 10m.  
**Acción:** Para mayor seguridad, valorar access_token 15–30 min y refresh_token 24–168 h según requisitos. Documentar la política en HYDRA_SETUP o AUTH_AND_RBAC.

### 3.6 Issuer y URLs en producción

**Archivo:** `config/hydra/hydra.production.yml`  
**Revisión:** `urls.self.issuer: https://api.cativo.dev` y consent/login/logout/error deben ser HTTPS y coherentes con el dominio público. Verificar que el discovery (e.g. `/.well-known/openid-configuration`) sea accesible y devuelva las URLs correctas.

---

# 4. API (NestJS)

## P0 – Crítico

### 4.1 Confianza ciega en headers X-User-*

**Archivos:** `api/src/guards/authenticated.guard.ts`, controladores  
**Problema:** El guard confía en `X-User-ID`, `X-User-Email`, `X-User-Role` sin comprobar que la petición haya pasado por Oathkeeper. Si alguien pudiera alcanzar la API sin pasar por el gateway (misconfiguración, bypass), podría suplantar identidad.

**Buenas prácticas (referencias):** OWASP / Guisso: *"Do not trust incoming headers by default from clients"*; los backends solo deben confiar en headers inyectados por **proxies designados como de confianza** cuando la API es accesible **únicamente** a través de ese proxy ([X-Forwarded-For](https://httptoolkit.com/blog/what-is-x-forwarded-for/)). Ory Kratos: Zero Trust; Admin API no expuesta a internet ([Production](https://www.ory.sh/docs/kratos/guides/production)).

**Acción:**
- Garantizar en red y despliegue que la API **nunca** sea accesible desde internet sin pasar por Oathkeeper (solo Oathkeeper en DMZ, API en red interna). Documentar esto como requisito de despliegue en OPERATIONS.
- Opcional: añadir un header o claim firmado que solo Oathkeeper conozca (ej. shared secret o JWT interno) y que la API verifique además de los headers, para defensa en profundidad.

### 4.2 JWT con clave e issuer fijos

**Archivo:** `api/src/guards/authenticated.guard.ts`  
**Problema:** La clave pública del id_token y el issuer están hardcodeados (`issuer: 'http://localhost:4455/'`). En producción el issuer será distinto y la clave puede rotar.

**Acción:**
- Cargar issuer y JWKS (o clave pública) desde configuración (ConfigService / env), por ejemplo `OAUTH_ISSUER`, `OAUTH_JWKS_URL` o `OAUTH_PUBLIC_KEY`. Usar el mismo issuer que Oathkeeper (id_token mutator) en cada entorno.

## P1 – Alto

### 4.3 Hydra Admin URL en producción

**Archivo:** `api/src/app.controller.ts`  
**Problema:** Por defecto se usa `http://oathkeeper:4455/api/internal/hydra-admin`. En producción no existe la regla internal-hydra-admin (y no debería exponerse). La API debe llamar a Hydra por red interna.

**Acción:**
- En producción configurar `HYDRA_ADMIN_URL=http://hydra:4445` (o la URL interna que corresponda) para que la API hable directo con Hydra. Documentar en OPERATIONS y en `.env.example`.

### 4.4 Endpoints hydra-accept-login / hydra-accept-consent

**Archivo:** `api/src/app.controller.ts`  
**Problema:** Cualquier usuario autenticado puede llamar a `POST .../hydra-accept-login` o `.../hydra-accept-consent` con un `login_challenge` o `consent_challenge` arbitrario. Hydra asocia el challenge a la sesión; si el flujo es correcto, el retorno de Hydra va al usuario que inició el flujo. El riesgo es confusión de flujos o uso indebido si no se valida que el challenge corresponde al usuario actual (Hydra ya vincula por cookie/session en el login; en consent la UI debe estar asociada al mismo usuario).  
**Acción:** Mantener la lógica actual pero documentar el flujo (quién puede llamar y por qué es seguro). Opcional: comprobar en backend que el subject que se envía a Hydra coincide con la sesión que está aceptando (Hydra ya lo hace en parte; refuerza si quieres defensa en profundidad).

## P2 – Medio

### 4.5 Roles de aplicación (app_admin / app_user) en SQLite/DB

**Archivos:** `api/src/roles/roles.service.ts`, guards  
**Problema:** Los roles de plataforma (platform_admin/platform_user) vienen de Kratos/Keto; los de aplicación (app_admin/app_user) viven en DB y se leen en el API. Si un atacante pudiera modificar la DB o inyectar headers, podría escalar privilegios.  
**Acción:** Asegurar que la API solo recibe tráfico desde Oathkeeper y que la DB de roles no sea modificable por usuarios normales. Considerar que el cambio de app_role sea solo desde un endpoint protegido por platform_admin (o equivalente) y auditado.

### 4.6 Logging de cabecera Authorization

**Archivo:** `api/src/guards/authenticated.guard.ts`  
**Problema:** `this.logger.log('authHeader', authHeader)` puede registrar el token Bearer completo.  
**Acción:** Eliminar el log del token o loguear solo “Bearer present” / longitud. Nunca loguear Authorization completo en producción.

---

# 5. Frontends (Auth, Admin, App)

## P0 – Crítico

### 5.1 Tokens OAuth en sessionStorage

**Archivo:** `frontend-app/src/composables/useHydraOAuth.js`  
**Problema:** Los tokens se guardan en `sessionStorage`. Cualquier script XSS en el mismo origen puede leerlos (robo de access/refresh token).

**Buenas prácticas (referencias):** Auth0/Curity: la práctica recomendada para SPAs es **BFF (Backend for Frontend)** con Authorization Code + PKCE, evitando guardar tokens en el navegador. Si no se usa BFF: (1) **sessionStorage** es preferible a localStorage (alcance por pestaña, no persistente); (2) **Authorization Code + PKCE** es obligatorio para clientes públicos; (3) cookies HttpOnly/Secure si el servidor puede gestionar la sesión ([Token Storage](https://auth0.com/docs/secure/security-guidance/data-security/token-storage), [BFF](https://auth0.com/blog/the-backend-for-frontend-pattern-bff)).

**Acción:** Para SPAs es un trade-off conocido. Mitigaciones: (1) Content-Security-Policy estricto, (2) refresh token con rotación y vida corta, (3) valorar BFF que guarde tokens en cookie httpOnly. Documentar el riesgo y las mitigaciones en AUTH_AND_RBAC o frontend-app README.

## P1 – Alto

### 5.2 Frontend-auth expone listUsers / updateUser / createUser

**Archivo:** `frontend-auth/src/composables/useAuth.js`  
**Problema:** El frontend de autenticación incluye funciones de administración (listUsers, updateUser, createUser, deleteUser, createRecoveryLink, etc.). La autorización real la hace Oathkeeper (Kratos Admin requiere view_users), pero tener esta superficie en el auth UI aumenta riesgo si hay un bug o una ruta expuesta.  
**Acción:** Mover todas las funciones de administración de usuarios (Kratos Admin + Keto sync) al frontend-admin únicamente. En frontend-auth dejar solo flujos de self-service (login, registro, recovery, verification, settings). Así se reduce superficie y se alinea con el principio de mínimo privilegio por app.

### 5.3 Validación de inputs en creación/edición de usuarios

**Archivo:** `frontend-admin/src/views/UsersManagement.vue` (y useAuth createUser/updateUser)  
**Problema:** El formulario “Add user” y la edición envían email, full_name, role, password. La validación es básica (required, type="email", minlength=8). No hay sanitización explícita ni comprobación de formato de email estricto; Kratos puede rechazar, pero conviene validar y sanitizar en cliente y en API si la API llegara a recibir estos datos.  
**Acción:** Validar email (regex o biblioteca), longitud máxima de full_name, y que role sea uno de los enum permitidos. En backend (si en el futuro la API recibe creación de usuarios), validar y sanitizar igual y no confiar solo en Kratos.

## P2 – Medio

### 5.4 Console.log en producción (admin)

**Archivos:** `frontend-admin/src/composables/useAuth.js` (y otros)  
**Problema:** Varios `console.log` con URLs, IDs, mensajes de flujo. En producción pueden filtrar información.  
**Acción:** Usar un logger condicionado a `import.meta.env.DEV` o eliminar/reducir logs en build de producción (Vite ya puede strip con el env correcto). No loguear IDs de usuario o tokens.

### 5.5 Inconsistencia rank vs role (frontend-auth vs frontend-admin)

**Archivos:** `frontend-auth/src/composables/useAuth.js` (rank, assignUserToRank, …), `frontend-admin/src/composables/useAuth.js` (role, assignUserToRole, …)  
**Problema:** Misma idea (rol de plataforma) con nombres distintos y posibles diferencias de integración con Keto (ranks vs roles).  
**Acción:** Unificar terminología en “role” y namespace Keto “ranks” (como en setup-all-permissions.sh). En frontend-auth usar las mismas funciones/nombres que en admin o un módulo compartido para no duplicar lógica y evitar desincronización.

---

# 6. Keto (Permisos)

## P1 – Alto

### 6.1 Namespaces ranks vs roles (ya cubierto en Oathkeeper)

Misma acción que en 1.4: unificar en `ranks` + `member` en reglas y scripts; no usar `roles`/`members` para la misma semántica.

## P2 – Medio

### 6.2 Keto Write sin autorización por operación

**Archivo:** `config/oathkeeper/rules.*.json` (keto-write)  
**Problema:** keto-write requiere sesión (cookie_session) pero no comprueba un permiso concreto (ej. `change_permissions` o `manage_permissions`). Cualquier usuario autenticado podría intentar escribir tuplas si alcanza la ruta.

**Buenas prácticas (referencias):** Ory Oathkeeper: los authorizers aseguran que el subject tenga permisos para acceder al servicio ([Authorizers](https://www.ory.sh/docs/oathkeeper/pipeline/authz)). Ory Keto: las relaciones representan permisos; solo sujetos autorizados deben poder crear/eliminar tuplas ([Relation Tuples](https://www.ory.sh/docs/keto/concepts/relation-tuples)).

**Acción:** Añadir authorizer `remote_json` a la regla keto-write que exija un permiso (p. ej. `users:management#change_permissions` o `system:admin#manage_permissions`) según quién deba poder modificar Keto. Así solo los roles adecuados pueden escribir en Keto.

---

# 7. General / Operaciones

## P0 – Crítico

### 7.1 Variables de entorno y .env

**Archivo:** `.env.example`  
**Problema:** Contraseñas y secretos con placeholders; si alguien despliega sin cambiar, el sistema queda débil.  
**Acción:** Documentar en README/GETTING_STARTED que ningún secret debe dejarse por defecto y que se debe usar un generador (ej. `openssl rand -base64 32`) para cada secret. Opcional: script de comprobación pre-deploy que falle si detecta valores por defecto en producción.

## P1 – Alto

### 7.2 CORS

**Archivos:** Varios (Oathkeeper, Kratos, Hydra)  
**Revisión:** En producción, `allowed_origins` debe contener solo los orígenes de tus frontends (https://admin.cativo.dev, etc.). No usar `*` con credenciales. Ya parece correcto en los archivos revisados; mantener esta política y revisar en cada nuevo dominio.

## P2 – Medio

### 7.3 Health checks y métricas

**Acción:** Exponer `/health` o `/ready` en API, Kratos, Hydra, Keto y Oathkeeper (donde aplique) y usarlos en orquestación (K8s/Docker). No devolver datos sensibles en health. Considerar métricas (Prometheus) para tasa de login, errores OAuth, latencia de Oathkeeper.

### 7.4 Documentación de arquitectura

**Archivos:** `docs/ARCHITECTURE.md`, `docs/AUTH_AND_RBAC.md`  
**Acción:** Actualizar diagramas y texto para reflejar: (1) que la API solo debe ser accesible vía Oathkeeper, (2) uso de `ranks` (no `roles`) para membership en Keto, (3) que internal-hydra-admin no debe exponerse y que la API debe usar Hydra por red interna en producción.

---

# 8. Checklist rápido por prioridad

**P0 (hacer ya):**
- [ ] Quitar o restringir `internal-hydra-admin`; API llamar a Hydra por URL interna.
- [ ] Corregir o documentar authorizer `remote_json_rate_limit` en access-rules.
- [ ] Secretos Kratos/Hydra por env en todos los entornos; sin valores por defecto inseguros.
- [ ] API solo accesible tras Oathkeeper; documentar.
- [ ] JWT en API: issuer y clave desde config; no hardcodear.
- [ ] No loguear Authorization ni tokens; revisar `.env` en producción.

**P1 (corto plazo):**
- [ ] Unificar Keto: ranks + member en Oathkeeper y scripts.
- [ ] Añadir oauth2_introspection a protected-api en producción.
- [ ] HYDRA_ADMIN_URL en producción apuntando a Hydra interna.
- [ ] Quitar funciones de admin de usuarios del frontend-auth.
- [ ] Validación/sanitización de inputs en creación/edición de usuarios.
- [ ] CORS solo orígenes necesarios; documentar política.

**P2 (medio plazo):**
- [ ] Mutators id_token usando `traits.role` y sin role fijo.
- [ ] Keto-write protegido por permiso (remote_json).
- [ ] Reducir console.log en frontends en producción.
- [ ] Unificar terminología rank/role y duplicación entre frontends.
- [ ] Session lifespan y TTL de tokens documentados y alineados con política.

**P3 (cuando sea posible):**
- [ ] Rate limiting definido (donde y cómo).
- [ ] Considerar BFF o cookies httpOnly para tokens en SPA.
- [ ] Tests de integración para flujos OAuth y permisos Keto.

---

## Ajustes aplicados (buenas prácticas)

| Área | Cambio |
|------|--------|
| **SECURITY_CODE_REVIEW.md** | Añadida sección "Referencias de buenas prácticas utilizadas" y "Buenas prácticas (referencias)" por hallazgo; tabla "Referencias rápidas" al final. |
| **access-rules.yml** | `remote_json_rate_limit` → `allow` (rate limiting en otro nivel); keto-protected-api: `roles`/`members` → `ranks`/`member`; mutators id_token: `traits.rank` / valor fijo → `traits.role`. |
| **rules.local.json** | frontend-admin authorizer: payload `ranks` + `member`. |
| **rules.production.json** | frontend-admin authorizer: payload `ranks` + `member`; protected-api: añadido authenticator `oauth2_introspection` y mutator headers para OAuth (X-User-* desde .Extra). |
| **API AuthenticatedGuard** | Eliminado log de `authHeader` (no loguear tokens); issuer y clave pública desde `ConfigService` (OAUTH_ISSUER, OAUTH_PUBLIC_KEY). |
| **.env.example** | Instrucción para generar secretos (`openssl rand -base64 32`); HYDRA_ADMIN_URL, OAUTH_ISSUER, OAUTH_PUBLIC_KEY; unificado nombre HYDRA_SYSTEM_SECRET. |
| **OPERATIONS.md** | Nueva sección "Security and deployment requirements" (API solo vía Oathkeeper, HYDRA_ADMIN_URL, secretos). |

---

## Referencias rápidas

| Tema | Enlace |
|------|--------|
| Oathkeeper Authenticators | https://www.ory.sh/docs/oathkeeper/pipeline/authn |
| Oathkeeper Authorizers | https://www.ory.sh/docs/oathkeeper/pipeline/authz |
| Kratos Production | https://www.ory.sh/docs/kratos/guides/production |
| Kratos Configuring | https://www.ory.sh/docs/kratos/configuring |
| Hydra Production | https://www.ory.sh/docs/hydra/self-hosted/production |
| Keto Namespaces | https://www.ory.sh/docs/keto/concepts/namespaces |
| Auth0 Token Storage | https://auth0.com/docs/secure/security-guidance/data-security/token-storage |
| OWASP API Security | https://owasp.org/API-Security |

---

*Documento generado como revisión de seguridad y buenas prácticas. Revisar y adaptar a tu política de riesgo y ciclo de despliegue.*
