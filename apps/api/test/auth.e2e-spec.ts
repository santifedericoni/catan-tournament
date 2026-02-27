/**
 * Auth integration tests.
 * Requires a running PostgreSQL instance (set DATABASE_URL in .env.test).
 * Run with: npm run test:e2e --workspace=apps/api
 */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Auth (e2e)', () => {
  let app: INestApplication;
  let accessToken: string;
  let refreshToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST /api/auth/register - creates a new user', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        email: `e2e-test-${Date.now()}@example.com`,
        password: 'Password123!',
        displayName: 'E2E Test User',
        alias: 'e2etest',
      })
      .expect(201);

    expect(res.body.accessToken).toBeDefined();
    expect(res.body.refreshToken).toBeDefined();
    expect(res.body.user.email).toContain('e2e-test-');

    accessToken = res.body.accessToken;
    refreshToken = res.body.refreshToken;
  });

  it('POST /api/auth/register - rejects duplicate email', async () => {
    const email = `dup-${Date.now()}@example.com`;
    await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({ email, password: 'Password123!', displayName: 'User' })
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({ email, password: 'Password123!', displayName: 'User' })
      .expect(409);
  });

  it('POST /api/auth/login - returns tokens', async () => {
    const email = `login-test-${Date.now()}@example.com`;
    await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({ email, password: 'Password123!', displayName: 'Login Test' });

    const res = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email, password: 'Password123!' })
      .expect(200);

    expect(res.body.accessToken).toBeDefined();
  });

  it('POST /api/auth/login - rejects wrong password', async () => {
    const email = `wrongpw-${Date.now()}@example.com`;
    await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({ email, password: 'Password123!', displayName: 'Wrong PW' });

    await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email, password: 'WrongPassword!' })
      .expect(401);
  });

  it('GET /api/auth/me - returns user info', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(res.body.email).toBeDefined();
  });

  it('POST /api/auth/refresh - issues new access token', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/auth/refresh')
      .send({ refreshToken })
      .expect(200);

    expect(res.body.accessToken).toBeDefined();
  });

  it('GET /api/auth/me - rejects invalid token', async () => {
    await request(app.getHttpServer())
      .get('/api/auth/me')
      .set('Authorization', 'Bearer invalid.token.here')
      .expect(401);
  });
});
