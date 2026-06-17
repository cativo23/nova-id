import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { WinstonLogger } from './common/logger';

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

    // Swagger OpenAPI documentation
    const swaggerConfig = new DocumentBuilder()
        .setTitle('Nova ID API')
        .setDescription('Self-hosted central IdP BFF — Ory consolidation layer')
        .setVersion('1.0')
        .addBearerAuth(
            { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
            'oathkeeper-id-token',
        )
        .build();
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('docs', app, document, {
        swaggerOptions: { persistAuthorization: true },
    });

    const port = process.env.PORT || 8080;
    await app.listen(port);
    console.log(`Nova ID API is running on: http://0.0.0.0:${port}`);
}

bootstrap();
