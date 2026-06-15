// api/scripts/generate-openapi.ts
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule, OpenAPIObject } from '@nestjs/swagger';
import { writeFileSync } from 'fs';
import { join } from 'path';
import { AppModule } from '../src/app.module';

/** Tags whose operations belong to the IdP client surface (ADR-0001). */
const ALLOWED_TAGS = new Set(['admin', 'me', 'auth']);

function filterByTags(doc: OpenAPIObject): OpenAPIObject {
  const paths = doc.paths ?? {};
  const kept: typeof paths = {};
  const HTTP_METHODS = ['get', 'put', 'post', 'delete', 'patch', 'options', 'head', 'trace'] as const;

  for (const [route, item] of Object.entries(paths)) {
    if (!item) continue;
    const keptItem: Record<string, unknown> = {};
    for (const method of HTTP_METHODS) {
      const op = (item as Record<string, any>)[method];
      if (!op) continue;
      const tags: string[] = op.tags ?? [];
      if (tags.some((t) => ALLOWED_TAGS.has(t))) {
        keptItem[method] = op;
      }
    }
    if (Object.keys(keptItem).length > 0) {
      kept[route] = keptItem as (typeof paths)[string];
    }
  }
  return { ...doc, paths: kept };
}

async function generate() {
  const app = await NestFactory.create(AppModule, { logger: false });
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
  const filtered = filterByTags(full);

  const outPath = join(__dirname, '..', 'openapi.json');
  writeFileSync(outPath, JSON.stringify(filtered, null, 2) + '\n');
  console.log(`OpenAPI spec written: ${outPath} (${Object.keys(filtered.paths ?? {}).length} paths)`);

  await app.close();
}

generate().catch((err) => {
  console.error('OpenAPI generation failed:', err);
  process.exit(1);
});
