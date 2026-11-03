import {
  HttpException,
  GoneException,
  BadGatewayException,
  Logger,
} from '@nestjs/common';
import type { AxiosError } from 'axios';

const logger = new Logger('OryError');

/**
 * Maps an error raised by an Ory admin API call (Hydra/Kratos/Keto) into a
 * meaningful Nest HttpException.
 *
 * Without this, the raw AxiosError propagates and Nest's default filter turns
 * it into a generic `500 Internal server error`, hiding the real reason from
 * the user — most commonly an expired login/consent challenge (Hydra returns
 * `401 request_unauthorized` with "The consent request has expired" once the
 * challenge TTL, default 30m, elapses). The SPA renders `response.data.message`,
 * so surfacing a clear message here is enough to fix the UX end-to-end.
 *
 * Existing HttpExceptions (e.g. the ForbiddenException from the IDOR/ownership
 * check) are passed through unchanged.
 */
export function toHttpExceptionFromOry(error: unknown): HttpException {
  if (error instanceof HttpException) return error;

  const axiosErr = error as AxiosError<{
    error?: string;
    error_description?: string;
  }>;
  const status = axiosErr?.response?.status;
  const data = axiosErr?.response?.data;
  const oryMessage = data?.error_description ?? data?.error;

  // Expired login/consent challenge: Hydra answers 401 with an "...has expired"
  // description. 410 Gone is the correct semantic — the challenge no longer
  // exists and the client must restart the OAuth flow.
  if (status === 401 && /expired/i.test(oryMessage ?? '')) {
    return new GoneException({
      statusCode: 410,
      code: 'oauth_challenge_expired',
      message: 'Your authorization session expired. Please start signing in again.',
    });
  }

  // Challenge not found or already consumed.
  if (status === 404 || status === 410) {
    return new GoneException({
      statusCode: 410,
      code: 'oauth_challenge_invalid',
      message: 'This authorization request is no longer valid. Please start signing in again.',
    });
  }

  // Any other upstream Ory failure: log the real cause server-side (never a
  // bare, silent 500), but do NOT forward Ory's raw message to the browser —
  // it can contain internal state (paths, config, stack-adjacent detail)
  // that the SPA has no business seeing. A generic, still-actionable message
  // goes to the client instead.
  if (oryMessage) {
    logger.error(`Ory upstream error (status ${status ?? 'unknown'}): ${oryMessage}`);
  }
  return new BadGatewayException({
    statusCode: 502,
    code: 'ory_upstream_error',
    message: 'The identity provider returned an unexpected error. Please try again.',
  });
}
