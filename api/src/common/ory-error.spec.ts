import {
  HttpException,
  GoneException,
  BadGatewayException,
  ForbiddenException,
} from '@nestjs/common';
import { toHttpExceptionFromOry } from './ory-error';

/** Build a minimal AxiosError-like object for the mapper under test. */
function axiosErr(status: number, data: unknown) {
  return { isAxiosError: true, response: { status, data } } as unknown;
}

describe('toHttpExceptionFromOry', () => {
  it('maps an expired consent challenge (401 + "expired") to 410 Gone with a clear message', () => {
    const ex = toHttpExceptionFromOry(
      axiosErr(401, {
        error: 'request_unauthorized',
        error_description:
          'The request could not be authorized. The consent request has expired, please try again.',
      }),
    );
    expect(ex).toBeInstanceOf(GoneException);
    expect(ex.getStatus()).toBe(410);
    const body = ex.getResponse() as { code: string; message: string };
    expect(body.code).toBe('oauth_challenge_expired');
    expect(body.message).toMatch(/expired/i);
  });

  it('maps a not-found challenge (404) to 410 Gone invalid', () => {
    const ex = toHttpExceptionFromOry(axiosErr(404, { error: 'not_found' }));
    expect(ex).toBeInstanceOf(GoneException);
    const body = ex.getResponse() as { code: string };
    expect(body.code).toBe('oauth_challenge_invalid');
  });

  it('maps any other Ory error to 502 Bad Gateway, surfacing the description', () => {
    const ex = toHttpExceptionFromOry(
      axiosErr(500, { error_description: 'boom upstream' }),
    );
    expect(ex).toBeInstanceOf(BadGatewayException);
    expect(ex.getStatus()).toBe(502);
    const body = ex.getResponse() as { message: string };
    expect(body.message).toContain('boom upstream');
  });

  it('passes existing HttpExceptions through unchanged (e.g. the IDOR ForbiddenException)', () => {
    const forbidden = new ForbiddenException('Consent challenge does not belong to current user');
    expect(toHttpExceptionFromOry(forbidden)).toBe(forbidden);
  });

  it('falls back to a generic 502 when the error carries no Ory detail', () => {
    const ex = toHttpExceptionFromOry(new Error('socket hang up'));
    expect(ex).toBeInstanceOf(BadGatewayException);
    expect(ex).toBeInstanceOf(HttpException);
  });
});
