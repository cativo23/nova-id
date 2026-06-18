// api/scripts/generate-openapi.ts
import { NestFactory } from '@nestjs/core';
import { VersioningType } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { writeFileSync } from 'fs';
import { join } from 'path';
import { AppModule } from '../src/app.module';
import { filterByTags } from '../src/common/openapi-filter';

/** Tags whose operations belong to the IdP client surface (ADR-0001). */
const ALLOWED_TAGS = new Set(['admin', 'me', 'auth']);

async function generate() {
  const app = await NestFactory.create(AppModule, { logger: false });
  // Must match main.ts: URI versioning so /v1/... paths appear in the spec.
  app.enableVersioning({ type: VersioningType.URI });
  const config = new DocumentBuilder()
    .setTitle('Nova ID API')
    .setDescription('Self-hosted central IdP BFF — Ory consolidation layer')
    .setVersion('1.0')
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      'oathkeeper-id-token',
    )
    .build();

  const full = SwaggerModule.createDocument(app, config);
  const filtered = filterByTags(full, ALLOWED_TAGS);

  const outPath = join(__dirname, '..', 'openapi.json');
  writeFileSync(outPath, JSON.stringify(filtered, null, 2) + '\n');
  console.log(`OpenAPI spec written: ${outPath} (${Object.keys(filtered.paths ?? {}).length} paths)`);

  await app.close();
}

generate().catch((err) => {
  console.error('OpenAPI generation failed:', err);
  // Set the exit code rather than calling process.exit(1): a synchronous
  // process.exit truncates buffered stderr, which hid the real boot error in CI.
  // Letting the event loop drain flushes the message before the process exits.
  process.exitCode = 1;
});
