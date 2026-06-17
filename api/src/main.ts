import { NestFactory } from '@nestjs/core';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule, OpenAPIObject } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { WinstonLogger } from './common/logger';
import { filterByTags } from './common/openapi-filter';

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
