import { NestFactory } from '@nestjs/core';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule, OpenAPIObject } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { WinstonLogger } from './common/logger';

const HTTP_METHODS = ['get', 'put', 'post', 'delete', 'patch', 'options', 'head', 'trace'] as const;

/** Collect all $ref values pointing to #/components/schemas/<Name>. */
function collectRefs(node: unknown, acc: Set<string>): void {
  if (!node || typeof node !== 'object') return;
  if (Array.isArray(node)) { node.forEach((n) => collectRefs(n, acc)); return; }
  for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
    if (k === '$ref' && typeof v === 'string') {
      const m = v.match(/^#\/components\/schemas\/(.+)$/);
      if (m) acc.add(m[1]);
    } else { collectRefs(v, acc); }
  }
}

/**
 * Prune components.schemas to only those transitively reachable via $ref
 * from the kept paths. securitySchemes and other component maps are preserved.
 */
function pruneSchemas(doc: OpenAPIObject): OpenAPIObject {
  const schemas = (doc.components?.schemas ?? {}) as Record<string, unknown>;
  const reachable = new Set<string>();
  collectRefs(doc.paths, reachable);
  const work = [...reachable];
  const visited = new Set<string>();
  while (work.length) {
    const name = work.pop()!;
    if (visited.has(name)) continue;
    visited.add(name);
    const before = reachable.size;
    collectRefs(schemas[name], reachable);
    if (reachable.size !== before) {
      for (const r of reachable) { if (!visited.has(r)) work.push(r); }
    }
  }
  const kept: Record<string, unknown> = {};
  for (const name of Object.keys(schemas)) { if (reachable.has(name)) kept[name] = schemas[name]; }
  return { ...doc, components: { ...doc.components, schemas: kept } };
}

/** Return a new doc containing only paths whose operations carry at least one of the given tags. */
function filterByTags(doc: OpenAPIObject, tags: Set<string>): OpenAPIObject {
  const paths = doc.paths ?? {};
  const kept: typeof paths = {};
  for (const [route, item] of Object.entries(paths)) {
    if (!item) continue;
    const keptItem: Record<string, unknown> = {};
    for (const method of HTTP_METHODS) {
      const op = (item as Record<string, any>)[method];
      if (!op) continue;
      const opTags: string[] = op.tags ?? [];
      if (opTags.some((t) => tags.has(t))) keptItem[method] = op;
    }
    if (Object.keys(keptItem).length > 0) kept[route] = keptItem as (typeof paths)[string];
  }
  return pruneSchemas({ ...doc, paths: kept });
}

async function bootstrap() {
    const app = await NestFactory.create(AppModule, {
        logger: WinstonLogger,
    });

    // Trust exactly one proxy hop (the Oathkeeper gateway — A0.4).
    // The BFF has no host-published ports; all traffic arrives via the gateway,
    // which sets X-Forwarded-For to the real client IP.  With trust=1 Express
    // (and therefore @nestjs/throttler) reads req.ip from that header instead
    // of the socket address (which is always the gateway's container IP).
    app.getHttpAdapter().getInstance().set('trust proxy', 1);

    // URI versioning: /v1/... for IdP business endpoints.
    // No global defaultVersion — unversioned controllers (health, public, demo)
    // remain accessible at their existing paths (version-neutral).
    app.enableVersioning({ type: VersioningType.URI });

    // Security headers — disable CSP so Swagger UI (inline scripts/styles) loads correctly.
    // All other helmet defaults (X-Frame-Options, X-Content-Type-Options, etc.) remain active.
    app.use(helmet({ contentSecurityPolicy: false }));

    // CORS: explicit allowlist; never reflect arbitrary origins. X-User-* and
    // X-Gateway-Auth are gateway-injected server-side and must NOT be accepted from browsers.
    const allowedOrigins = (process.env.CORS_ALLOWED_ORIGINS || '')
      .split(',')
      .map((o) => o.trim())
      .filter(Boolean);
    app.enableCors({
      origin: allowedOrigins.length > 0 ? allowedOrigins : false,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Frontend-Source'],
    });

    // Global validation pipe
    app.useGlobalPipes(
        new ValidationPipe({
            whitelist: true,
            transform: true,
            forbidNonWhitelisted: true,
        }),
    );

    // ── Swagger / OpenAPI ─────────────────────────────────────────────────────
    // Build one full document, derive two tag-filtered views:
    //
    //   /docs         + /docs-json        PUBLIC  (tags: auth, me)
    //   /docs/admin   + /docs/admin-json  ADMIN   (tag: admin)
    //
    // Security posture: the BFF container has zero host-published ports
    // (docker-compose.yml, A0.4) and no Oathkeeper rule forwards /docs* to
    // the BFF.  Neither endpoint is reachable from outside the Docker network.
    // The tag split still matters: /docs served to legitimate callers contains
    // zero admin operation shapes, so accidental leakage via misconfigured
    // future gateway rules is limited to the public surface.
    const bearerAuth = { type: 'http' as const, scheme: 'bearer', bearerFormat: 'JWT' };

    const fullConfig = new DocumentBuilder()
        .setTitle('Nova ID API')
        .setDescription('Self-hosted central IdP BFF — Ory consolidation layer')
        .setVersion('1.0')
        .addBearerAuth(bearerAuth, 'oathkeeper-id-token')
        .build();
    const fullDocument = SwaggerModule.createDocument(app, fullConfig);

    // PUBLIC doc — auth + me tags only (zero /admin paths)
    const publicDocument = filterByTags(fullDocument, new Set(['auth', 'me']));
    SwaggerModule.setup('docs', app, publicDocument, {
        swaggerOptions: { persistAuthorization: true },
        jsonDocumentUrl: 'docs-json',
    });

    // ADMIN doc — admin tag only; not routed via gateway (internal surface)
    const adminDocument = {
        ...filterByTags(fullDocument, new Set(['admin'])),
        info: {
            title: 'Nova ID Admin API',
            description: 'Nova ID BFF — Platform-admin operations (internal surface, not publicly routed)',
            version: '1.0',
        },
    } as OpenAPIObject;
    SwaggerModule.setup('docs/admin', app, adminDocument, {
        swaggerOptions: { persistAuthorization: true },
        jsonDocumentUrl: 'docs/admin-json',
    });

    const port = process.env.PORT || 8080;
    await app.listen(port);
    console.log(`Nova ID API is running on: http://0.0.0.0:${port}`);
}

bootstrap();
