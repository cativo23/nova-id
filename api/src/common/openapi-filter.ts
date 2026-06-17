import { OpenAPIObject } from '@nestjs/swagger';

export const HTTP_METHODS = ['get', 'put', 'post', 'delete', 'patch', 'options', 'head', 'trace'] as const;

/** Collect all $ref values pointing to #/components/schemas/<Name>. */
export function collectRefs(node: unknown, acc: Set<string>): void {
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
export function pruneSchemas(doc: OpenAPIObject): OpenAPIObject {
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

/**
 * Return a new doc containing only paths whose operations carry at least one
 * of the given tags. Automatically calls pruneSchemas on the result.
 */
export function filterByTags(doc: OpenAPIObject, allowedTags: Set<string>): OpenAPIObject {
  const paths = doc.paths ?? {};
  const kept: typeof paths = {};
  for (const [route, item] of Object.entries(paths)) {
    if (!item) continue;
    const keptItem: Record<string, unknown> = {};
    for (const method of HTTP_METHODS) {
      const op = (item as Record<string, any>)[method];
      if (!op) continue;
      const opTags: string[] = op.tags ?? [];
      if (opTags.some((t) => allowedTags.has(t))) keptItem[method] = op;
    }
    if (Object.keys(keptItem).length > 0) kept[route] = keptItem as (typeof paths)[string];
  }
  return pruneSchemas({ ...doc, paths: kept });
}
