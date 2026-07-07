import { registerDecorator, ValidationOptions } from 'class-validator';

const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '::1']);

/**
 * RFC 8252 / RFC 9700 restrict cleartext `http://` redirect URIs to the
 * loopback interface (native-app flows redirecting to a local port); any
 * other host MUST use `https://`. Plain `@IsUrl({protocols:['http','https']})`
 * has no concept of "except for loopback" and would let an attacker register
 * a client with an `http://` redirect to an arbitrary host, exposing the
 * authorization code / tokens to network eavesdroppers.
 */
export function isSecureRedirectUri(value: unknown): boolean {
  if (typeof value !== 'string') return false;
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return false;
  }
  if (url.protocol === 'https:') return true;
  if (url.protocol === 'http:') {
    const hostname = url.hostname.replace(/^\[|\]$/g, '');
    return LOOPBACK_HOSTS.has(hostname);
  }
  return false;
}

export function IsSecureRedirectUri(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isSecureRedirectUri',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown) {
          return isSecureRedirectUri(value);
        },
        defaultMessage() {
          return `${propertyName} must be an https:// URL, or an http:// URL pointing at localhost/127.0.0.1/[::1] (RFC 8252 loopback exception)`;
        },
      },
    });
  };
}
