import { isSecureRedirectUri } from './secure-redirect-uri.validator';

describe('isSecureRedirectUri', () => {
  it('accepts https:// URLs for any host', () => {
    expect(isSecureRedirectUri('https://app.example.com/callback')).toBe(true);
  });

  it('rejects http:// URLs for a non-loopback host (plaintext leak risk)', () => {
    expect(isSecureRedirectUri('http://evil.example.com/callback')).toBe(false);
  });

  it('accepts http:// on localhost (native-app loopback exception, RFC 8252)', () => {
    expect(isSecureRedirectUri('http://localhost:4000/callback')).toBe(true);
  });

  it('accepts http:// on 127.0.0.1', () => {
    expect(isSecureRedirectUri('http://127.0.0.1:4000/callback')).toBe(true);
  });

  it('accepts http:// on the IPv6 loopback [::1]', () => {
    expect(isSecureRedirectUri('http://[::1]:4000/callback')).toBe(true);
  });

  it('rejects non-URL strings', () => {
    expect(isSecureRedirectUri('not-a-url')).toBe(false);
  });

  it('rejects non-http(s) schemes', () => {
    expect(isSecureRedirectUri('ftp://example.com/callback')).toBe(false);
  });
});
