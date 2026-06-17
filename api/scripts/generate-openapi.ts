// api/scripts/generate-openapi.ts
import { NestFactory } from '@nestjs/core';
import { VersioningType } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule, OpenAPIObject } from '@nestjs/swagger';
import { writeFileSync } from 'fs';
import { join } from 'path';
import { AppModule } from '../src/app.module';

/** Tags whose operations belong to the IdP client surface (ADR-0001). */
const ALLOWED_TAGS = new Set(['admin', 'me', 'auth']);

/** Collect all $ref values pointing to #/components/schemas/<Name>. */
function collectRefs(node: unknown, acc: Set<string>): void {
  if (!node || typeof node !== 'object') return;
  if (Array.isArray(node)) {
    node.forEach((n) => collectRefs(n, acc));
    return;
  }
  for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
    if (k === '$ref' && typeof v === 'string') {
      const m = v.match(/^#\/components\/schemas\/(.+)$/);
      if (m) acc.add(m[1]);
    } else {
      collectRefs(v, acc);
    }
  }
}

/**
 * Prune components.schemas to only those reachable (transitively via $ref)
 * from the kept paths. Cycles are handled via a visited set.
 * securitySchemes and other components.* maps are left untouched.
 */
function pruneSchemas(doc: OpenAPIObject): OpenAPIObject {
  const schemas = (doc.components?.schemas ?? {}) as Record<string, unknown>;
  const reachable = new Set<string>();

  // Seed: all $refs in the kept paths
  collectRefs(doc.paths, reachable);

  // Transitively follow $refs inside each reachable schema
  const work = [...reachable];
  const visited = new Set<string>();
  while (work.length) {
    const name = work.pop()!;
    if (visited.has(name)) continue;
    visited.add(name);
    const schema = schemas[name];
    const before = reachable.size;
    collectRefs(schema, reachable);
    if (reachable.size !== before) {
      // new names were added — push them onto the worklist
      for (const r of reachable) {
        if (!visited.has(r)) work.push(r);
      }
    }
  }

  const kept: Record<string, unknown> = {};
  for (const name of Object.keys(schemas)) {
    if (reachable.has(name)) kept[name] = schemas[name];
  }

  return { ...doc, components: { ...doc.components, schemas: kept } };
}

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
  const filtered = pruneSchemas(filterByTags(full));

  const outPath = join(__dirname, '..', 'openapi.json');
  writeFileSync(outPath, JSON.stringify(filtered, null, 2) + '\n');
  console.log(`OpenAPI spec written: ${outPath} (${Object.keys(filtered.paths ?? {}).length} paths)`);

  await app.close();
}

generate().catch((err) => {
  console.error('OpenAPI generation failed:', err);
  process.exit(1);
});
