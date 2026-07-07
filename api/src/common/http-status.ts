/**
 * Translate an Axios-style error's response status to its HTTP status code,
 * or undefined when the error carries no response (network failure, etc).
 *
 * Shared by KratosAdminService and HydraService so both admin API clients
 * classify upstream Ory errors (404/409/...) the same way instead of letting
 * them fall through as raw 500s.
 */
export function httpStatus(err: unknown): number | undefined {
  return (err as any)?.response?.status as number | undefined;
}
