import * as winston from 'winston';
import { redactSensitiveFields, WinstonLogger } from './logger';

describe('redactSensitiveFields', () => {
  it('masks top-level sensitive keys, leaves others untouched', () => {
    const result = redactSensitiveFields({ password: 'hunter2', ok: 'fine' });
    expect(result).toEqual({ password: '[REDACTED]', ok: 'fine' });
  });

  it('masks nested sensitive keys', () => {
    const result = redactSensitiveFields({ user: { token: 'abc', name: 'Bob' } });
    expect(result).toEqual({ user: { token: '[REDACTED]', name: 'Bob' } });
  });

  it('is case-insensitive and covers password/token/secret/ssn/dob/national_id/patient_name', () => {
    const result = redactSensitiveFields({
      Password: 'a',
      TOKEN: 'b',
      Secret: 'c',
      SSN: 'd',
      Dob: 'e',
      national_id: 'f',
      patient_name: 'g',
      other: 'h',
    });
    expect(result).toEqual({
      Password: '[REDACTED]',
      TOKEN: '[REDACTED]',
      Secret: '[REDACTED]',
      SSN: '[REDACTED]',
      Dob: '[REDACTED]',
      national_id: '[REDACTED]',
      patient_name: '[REDACTED]',
      other: 'h',
    });
  });

  it('redacts sensitive keys inside arrays of objects', () => {
    const result = redactSensitiveFields([{ password: 'x' }, { ok: 'y' }]);
    expect(result).toEqual([{ password: '[REDACTED]' }, { ok: 'y' }]);
  });

  it('passes through primitives unchanged', () => {
    expect(redactSensitiveFields('plain string')).toBe('plain string');
    expect(redactSensitiveFields(42)).toBe(42);
    expect(redactSensitiveFields(null)).toBeNull();
  });
});

describe('WinstonLogger file transports', () => {
  it('bounds error.log and combined.log with maxsize + maxFiles (prevent unbounded disk growth)', () => {
    const rawLogger = (WinstonLogger as any).getWinstonLogger();
    const fileTransports = rawLogger.transports.filter((t: any) => t instanceof winston.transports.File);

    expect(fileTransports.length).toBe(2);
    for (const transport of fileTransports as any[]) {
      expect(transport.maxsize).toBeGreaterThan(0);
      expect(transport.maxFiles).toBeGreaterThan(0);
    }
  });
});
