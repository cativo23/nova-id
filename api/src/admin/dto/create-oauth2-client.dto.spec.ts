import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateOauth2ClientDto } from './create-oauth2-client.dto';

async function validateDto(payload: Record<string, unknown>) {
  const dto = plainToInstance(CreateOauth2ClientDto, payload);
  return validate(dto);
}

describe('CreateOauth2ClientDto', () => {
  it('rejects an empty redirect_uris array — a client with no redirect URI is unusable', async () => {
    const errors = await validateDto({
      client_name: 'Test App',
      redirect_uris: [],
    });

    const redirectErrors = errors.find((e) => e.property === 'redirect_uris');
    expect(redirectErrors).toBeDefined();
  });

  it('accepts a non-empty redirect_uris array', async () => {
    const errors = await validateDto({
      client_name: 'Test App',
      redirect_uris: ['https://app.example/callback'],
    });

    const redirectErrors = errors.find((e) => e.property === 'redirect_uris');
    expect(redirectErrors).toBeUndefined();
  });
});
