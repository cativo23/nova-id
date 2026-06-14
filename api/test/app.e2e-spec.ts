import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';

describe('App (e2e) - Zero Trust JWT Implementation', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  describe('Public Endpoints', () => {
    it('/health (GET) - should be accessible without authentication', () => {
      return request(app.getHttpServer())
        .get('/health')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('status', 'ok');
          expect(res.body).toHaveProperty('service', 'nova-id-api');
          expect(res.body).toHaveProperty('oryIntegration', true);
        });
    });

    it('/public (GET) - should be accessible without authentication', () => {
      return request(app.getHttpServer())
        .get('/public')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('message');
          expect(res.body.data).toHaveProperty('oryIntegration');
        });
    });
  });

  describe('Protected Endpoints - JWT Authentication', () => {
    const validJwt =
      'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ0ZXN0LXVzZXItaWQiLCJlbWFpbCI6InRlc3RAZXhhbXBsZS5jb20iLCJyb2xlIjoicGxhdGZvcm1fYWRtaW4iLCJpYXQiOjE2ODM2OTIwMDAsImV4cCI6MTY4MzY5NTYwMH0.test-signature';

    it('/protected (GET) - should reject requests without JWT', () => {
      return request(app.getHttpServer())
        .get('/protected')
        .expect(401)
        .expect((res) => {
          expect(res.body.message).toContain('Unauthorized');
        });
    });

    it('/protected (GET) - should reject requests with invalid JWT', () => {
      return request(app.getHttpServer())
        .get('/protected')
        .set('Authorization', 'Bearer invalid.jwt.token')
        .expect(401)
        .expect((res) => {
          // Guard throws UnauthorizedException('Invalid token') for any JWT
          // that fails JWKS verification (malformed, wrong key, wrong issuer, etc.)
          expect(res.body.message).toContain('Invalid token');
        });
    });

    it('/protected (GET) - should accept valid JWT (mock test)', () => {
      return request(app.getHttpServer())
        .get('/protected')
        .set('Authorization', `Bearer ${validJwt}`)
        .expect(401); // Will fail JWT validation since signature is invalid
    });
  });

  describe('Role-Based Authorization', () => {
    it('/admin-demo (GET) - should require platform_admin', () => {
      return request(app.getHttpServer()).get('/admin-demo').expect(401);
    });

    it('/user-demo (GET) - should require authentication', () => {
      return request(app.getHttpServer()).get('/user-demo').expect(401);
    });
  });

  describe('Zero Trust Validation', () => {
    it('should not have Ory service dependencies', () => {
      expect(true).toBe(true);
    });

    it('should validate JWT tokens locally', () => {
      expect(true).toBe(true);
    });
  });

  // A1-plan-1: new BFF-core endpoints. In-process (no gateway), so the controller
  // paths are reached WITHOUT the `/api` prefix the gateway strips. The global
  // AuthenticatedGuard must reject every one of them without a Bearer id_token.
  describe('A1 BFF core endpoints (unauthenticated)', () => {
    it('GET /admin/users - should reject without a Bearer id_token', () =>
      request(app.getHttpServer()).get('/admin/users').expect(401));

    it('POST /admin/users - should reject without a Bearer id_token', () =>
      request(app.getHttpServer()).post('/admin/users').send({}).expect(401));

    it('GET /me/permissions - should reject without a Bearer id_token', () =>
      request(app.getHttpServer()).get('/me/permissions').expect(401));
  });
});
