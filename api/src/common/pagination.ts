/**
 * Parse a Kratos/Hydra `Link` response header and return the `page_token`
 * from the rel="next" entry, or null when there is no further page.
 *
 * Shared by KratosAdminService.listIdentities and HydraService.listClients —
 * both admin list endpoints are cursor-paginated by Ory the same way.
 */
export function parseNextPageToken(linkHeader: string | undefined | null): string | null {
  if (!linkHeader) return null;
  // Header may contain multiple comma-separated entries, e.g.:
  //   <URL1>; rel="next", <URL2>; rel="prev"
  const entries = linkHeader.split(',');
  for (const entry of entries) {
    if (!entry.includes('rel="next"')) continue;
    const urlMatch = entry.match(/<([^>]+)>/);
    if (!urlMatch) continue;
    try {
      const url = new URL(urlMatch[1]);
      const token = url.searchParams.get('page_token');
      if (token) return token;
    } catch {
      // malformed URL — skip
    }
  }
  return null;
}
