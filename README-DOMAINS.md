# Configuración de Dominios - Nova ID

Este documento describe la configuración de dominios locales y de producción para el proyecto Nova ID usando Ory Stack.

## Tabla de Dominios

| Servicio | Local | Producción |
|----------|-------|------------|
| Kratos Self-Service UI | `http://auth.local` | `https://auth.cativo.dev` |
| Admin Dashboard | `http://admin.local` | `https://admin.cativo.dev` |
| API Gateway (Oathkeeper) | `http://api.local` | `https://id.cativo.dev` |

## Setup Local

### 1. Configurar Dominios Locales

Ejecuta el script para agregar los dominios a `/etc/hosts`:

```bash
sudo ./scripts/setup-local-domains.sh
```

Este script agrega:
- `127.0.0.1    auth.local`
- `127.0.0.1    admin.local`
- `127.0.0.1    api.local`

### 2. Configurar Variables de Entorno

Copia el template y ajusta según necesites:

```bash
cp .env.example .env
# Edita .env con tus valores
```

### 3. Iniciar Servicios

```bash
./start-local.sh
```

Este script:
- Verifica que los dominios estén configurados
- Carga variables de entorno desde `.env`
- Inicia todos los servicios con `docker-compose`

### 4. Verificar

Abre en tu navegador:
- http://auth.local - Kratos Self-Service UI
- http://admin.local - Admin Dashboard
- http://api.local - API Gateway

### Ver Logs

```bash
docker-compose -f docker-compose.yml -f docker-compose.local.yml logs -f
```

### Detener Servicios

```bash
docker-compose -f docker-compose.yml -f docker-compose.local.yml down
```

## Setup Producción

### 1. Configurar DNS

Asegúrate de que estos dominios apunten a tu servidor:

- `auth.cativo.dev` → IP del servidor
- `admin.cativo.dev` → IP del servidor
- `id.cativo.dev` → IP del servidor

### 2. Configurar Variables de Entorno

Crea `.env.production` con valores de producción:

```bash
cp .env.example .env.production
# Edita .env.production con valores de producción
```

**IMPORTANTE:** Genera nuevos secretos para producción:
- `POSTGRES_PASSWORD`
- `KRATOS_DB_PASSWORD`
- `HYDRA_DB_PASSWORD`
- `KETO_DB_PASSWORD`
- `KRATOS_SECRETS_COOKIE`
- `KRATOS_SECRETS_CIPHER`
- `HYDRA_SYSTEM_SECRET`

### 3. Configurar SMTP

Actualiza `SMTP_CONNECTION_URI` en `.env.production` con tu servidor SMTP de producción.

### 4. Verificar Traefik

El servidor debe tener Traefik corriendo en el stack `space-server` con la red `space-server_web`.

Verifica que la red existe:

```bash
docker network ls | grep space-server_web
```

### 5. Iniciar Servicios

```bash
./start-production.sh
```

Este script:
- Verifica que la red de Traefik existe
- Carga variables de entorno desde `.env.production`
- Inicia todos los servicios con configuración de producción
- Conecta servicios públicos a la red de Traefik

### 6. Verificar

Abre en tu navegador:
- https://auth.cativo.dev - Kratos Self-Service UI
- https://admin.cativo.dev - Admin Dashboard
- https://id.cativo.dev - API Gateway

### Ver Logs

```bash
docker-compose -f docker-compose.yml -f docker-compose.production.yml logs -f
```

### Detener Servicios

```bash
docker-compose -f docker-compose.yml -f docker-compose.production.yml down
```

## Cambiar entre Ambientes

### De Local a Producción

1. Detén servicios locales:
   ```bash
   docker-compose -f docker-compose.yml -f docker-compose.local.yml down
   ```

2. Inicia servicios de producción:
   ```bash
   ./start-production.sh
   ```

### De Producción a Local

1. Detén servicios de producción:
   ```bash
   docker-compose -f docker-compose.yml -f docker-compose.production.yml down
   ```

2. Inicia servicios locales:
   ```bash
   ./start-local.sh
   ```

## Nota sobre Traefik

**El servidor usa Traefik del stack `space-server` en la red `space-server_web`.**

- NO se crea un nuevo servicio Traefik
- Los servicios se conectan a la red existente: `space-server_web`
- Traefik maneja automáticamente:
  - Certificados SSL (Let's Encrypt)
  - Enrutamiento por dominio
  - Balanceo de carga

Los servicios públicos (oathkeeper, frontend-auth, frontend-admin) tienen labels de Traefik que configuran el enrutamiento automáticamente.

## Troubleshooting

### Cannot resolve hostname

**Síntoma:** `getaddrinfo ENOTFOUND auth.local`

**Solución:**
1. Verifica que los dominios estén en `/etc/hosts`:
   ```bash
   cat /etc/hosts | grep local
   ```
2. Si faltan, ejecuta:
   ```bash
   sudo ./scripts/setup-local-domains.sh
   ```

### Connection refused

**Síntoma:** `ECONNREFUSED` al acceder a un servicio

**Solución:**
1. Verifica que los servicios estén corriendo:
   ```bash
   docker-compose ps
   ```
2. Revisa los logs:
   ```bash
   docker-compose logs <service-name>
   ```
3. Verifica que los puertos no estén en uso:
   ```bash
   netstat -tulpn | grep <port>
   ```

### Traefik routing issues

**Síntoma:** 404 o certificado inválido en producción

**Solución:**
1. Verifica que los servicios estén en la red correcta:
   ```bash
   docker network inspect space-server_web
   ```
2. Verifica los labels de Traefik:
   ```bash
   docker inspect <container-name> | grep -A 10 Labels
   ```
3. Verifica que Traefik esté corriendo:
   ```bash
   docker ps | grep traefik
   ```
4. Revisa logs de Traefik:
   ```bash
   docker logs <traefik-container>
   ```

### Ory services not starting

**Síntoma:** Servicios Ory fallan al iniciar

**Solución:**
1. Verifica que las migraciones se completaron:
   ```bash
   docker-compose logs kratos-migrate
   docker-compose logs hydra-migrate
   docker-compose logs keto-migrate
   ```
2. Verifica que las variables de entorno estén correctas:
   ```bash
   docker-compose config | grep -A 5 kratos
   ```
3. Verifica que los archivos de configuración existan:
   ```bash
   ls -la config/kratos/kratos.local.yml
   ls -la config/kratos/kratos.production.yml
   ```

### Database connection errors

**Síntoma:** `connection refused` o `authentication failed`

**Solución:**
1. Verifica que PostgreSQL esté corriendo:
   ```bash
   docker-compose ps postgres
   ```
2. Verifica las contraseñas en `.env` o `.env.production`
3. Verifica que las migraciones de usuarios se completaron:
   ```bash
   docker-compose logs postgres-init
   ```

## Estructura de Archivos

```
nova-id/
├── config/
│   ├── kratos/
│   │   ├── kratos.local.yml          # Config Kratos desarrollo
│   │   ├── kratos.production.yml     # Config Kratos producción
│   │   └── identity.schema.json
│   ├── hydra/
│   │   ├── hydra.local.yml           # Config Hydra desarrollo
│   │   └── hydra.production.yml      # Config Hydra producción
│   ├── keto/
│   │   ├── keto.local.yml            # Config Keto desarrollo
│   │   └── keto.production.yml       # Config Keto producción
│   └── oathkeeper/
│       ├── oathkeeper.local.yml      # Config Oathkeeper desarrollo
│       ├── oathkeeper.production.yml # Config Oathkeeper producción
│       ├── rules.local.json          # Rules desarrollo
│       └── rules.production.json     # Rules producción
├── docker-compose.yml                # Base configuration
├── docker-compose.local.yml          # Override desarrollo
├── docker-compose.production.yml     # Override producción
├── .env                              # Variables desarrollo
├── .env.production                   # Variables producción (NO COMMIT)
├── .env.example                      # Template
├── start-local.sh                    # Script inicio desarrollo
├── start-production.sh               # Script inicio producción
└── scripts/
    └── setup-local-domains.sh        # Script setup dominios locales
```

## Frontend Environment Variables

Cada frontend tiene sus propios archivos `.env.local` y `.env.production`:

- `frontend-auth/.env.local` y `.env.production`
- `frontend-admin/.env.local` y `.env.production`
- `frontend-app/.env.local` y `.env.production`

Estos archivos usan el prefijo `VITE_` para variables de entorno en Vite.

## Configuración de Ory

**IMPORTANTE:** Los archivos de configuración de Ory (Kratos, Hydra, Keto, Oathkeeper) NO pueden leer archivos `.env` directamente.

**Sistema usado:**
1. Archivos YAML separados por ambiente (`*.local.yml`, `*.production.yml`)
2. Variables de entorno pasadas vía `docker-compose` donde Ory lo soporta
3. Comando con flag `-c /etc/config/{service}/{service}.${ENVIRONMENT}.yml`

**Separación de concerns:**
- `.env` → Solo para servicios propios y docker-compose
- `*.local.yml` → Config Ory para desarrollo
- `*.production.yml` → Config Ory para producción

## Seguridad

### Never Commit

- ❌ `.env.production` (con secretos reales)
- ❌ `*.log`
- ❌ Backups de DB
- ❌ Certificados privados

### Always Commit

- ✅ `.env.example` (template sin secretos)
- ✅ `*.local.yml` (configs de desarrollo)
- ✅ `*.production.yml` (configs de producción - sin secretos hardcodeados)
- ✅ Scripts de setup

### Generar Secretos

Para generar secretos seguros (32+ caracteres):

```bash
# Linux/Mac
openssl rand -base64 32

# O usando /dev/urandom
head -c 32 /dev/urandom | base64
```

## Referencias

- [Ory Configuration Documentation](https://www.ory.com/docs/ecosystem/configuring)
- [Docker Compose Override Files](https://docs.docker.com/compose/extends/)
- [Traefik Docker Provider](https://doc.traefik.io/traefik/providers/docker/)
