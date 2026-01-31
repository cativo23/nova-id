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

### Prioridad P0 – Crítico (Acción Inmediata)

#### 1. Clave Pública JWT Hardcodeada en API
- **Problema:** El `AuthenticatedGuard` utiliza una clave pública por defecto (`DEFAULT_PUBLIC_KEY`) si no se encuentra la variable de entorno `OAUTH_PUBLIC_KEY`.
- **Riesgo:** Si un despliegue olvida configurar la clave real, la API aceptará tokens firmados con una clave privada conocida (o la que corresponda al placeholder), permitiendo suplantación total de identidad.
- **Acción:** Eliminar el fallback en producción; lanzar un error si las claves no están configuradas.

#### 2. Regla `internal-hydra-admin` expuesta con `noop` (Local)
- **Problema:** En `rules.local.json`, la regla que apunta a Hydra Admin (`http://hydra:4445`) no tiene autenticación.
- **Riesgo:** Cualquier cliente que alcance el puerto de Oathkeeper puede manipular clientes OAuth2 y consentimientos.
- **Acción:** Eliminar esta regla de Oathkeeper. La API debe comunicarse con Hydra Admin directamente por la red interna de Docker (`http://hydra:4445`).

#### 3. Configuración de CORS Excesivamente Permisiva
- **Problema:** La API tiene `origin: true`, aceptando cualquier origen, y permite cabeceras de identidad (`X-User-Id`, etc.) desde el cliente.
- **Riesgo:** Facilita ataques CSRF y bypass de lógica si la API es expuesta accidentalmente.
- **Acción:** Implementar una lista blanca estricta en `ALLOWED_ORIGINS` y prohibir que el cliente envíe cabeceras `X-User-*` (estas deben venir solo del Proxy).

---

### Prioridad P1 – Alto

#### 4. Almacenamiento de Tokens en Frontend (SessionStorage)
- **Problema:** Los tokens de acceso y de ID se guardan en `sessionStorage`.
- **Riesgo:** Vulnerable a ataques XSS. Si un atacante inyecta script, puede robar los tokens.
- **Acción:** Evaluar el uso de patrones **BFF (Backend for Frontend)** o cookies `HttpOnly`/`Secure` para el almacenamiento de tokens.

#### 5. Exposición de Funciones Admin en Frontend-Auth
- **Problema:** El frontend de autenticación incluye lógica para listar y modificar usuarios (funciones destinadas a administradores).
- **Acción:** Mover todas las funciones de administración (`listUsers`, `updateUser`, etc.) exclusivamente al `frontend-admin`. El `frontend-auth` debe limitarse a login, registro y autoservicio.

#### 6. Falta de Rate Limiting
- **Problema:** No hay límites de peticiones implementados en la API ni en el Gateway.
- **Riesgo:** Vulnerabilidad a ataques de fuerza bruta y DoS.
- **Acción:** Implementar `ThrottlerModule` en NestJS y configurar rate limiting en Oathkeeper.

---

### Prioridad P2 – Medio

#### 7. Protección de Escritura en Keto
- **Problema:** La regla `keto-write` requiere sesión pero no un permiso específico de administración.
- **Acción:** Añadir un authorizer `remote_json` que exija el permiso `system:admin#manage_permissions` para realizar cambios en Keto.

#### 8. Health Checks y Observabilidad
- **Acción:** Asegurar que los endpoints de salud no filtren información sensible y configurar métricas para monitorear intentos de login fallidos o errores de autorización.

---

## ✅ Ítems Resueltos (Vulnerabilidades Mitigadas)
*Los siguientes puntos han sido verificados en el código y ya no representan un riesgo abierto:*

- [x] **Unificación de Namespaces en Keto:** Se utiliza consistentemente `ranks` + `member` en lugar de la confusión previa con `roles`.
- [x] **Introspección de OAuth2 en Producción:** La regla `protected-api` ahora soporta correctamente tokens Bearer mediante `oauth2_introspection`.
- [x] **Mutadores de Roles:** Los mutadores de Oathkeeper ahora extraen el rol desde `traits.role` correctamente para todos los usuarios.
- [x] **Seguridad de Cookies:** `secure: true` configurado correctamente para entornos de producción.
- [x] **Hashing de Contraseñas:** Se utiliza un coste de Bcrypt adecuado (12) en producción para Ory Hydra.

---

## 📋 Checklist de Seguridad Progresivo

- [ ] **Secretos:** Verificar que no existan valores `PLEASE-CHANGE-ME` en archivos YAML de producción.
- [ ] **Headers:** Añadir CSP (Content Security Policy) y HSTS en el balanceador frontal o Oathkeeper.
- [ ] **Validación:** Implementar validación estricta de `issuer` y `audience` en la API.
- [ ] **Limpieza:** Eliminar `console.log` sensibles en los builds de producción de los frontends.

---
*Este documento es la fuente oficial de seguridad para Nova ID. Debe actualizarse tras cada corrección crítica.*
