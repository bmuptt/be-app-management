import dotenv from 'dotenv';
import { TestHelper, AuthLogic } from '../../test-util';
import supertest from 'supertest';
import { web } from '../../../src/config/web';

dotenv.config();

describe('Refresh Token', () => {
  let refresh_token: string | null;

  beforeEach(async () => {
    await TestHelper.refreshDatabase();

    const loginResponse = await AuthLogic.getLoginSuperAdmin();
    refresh_token = loginResponse.body.refresh_token;
  });

  afterEach(async () => {
    await TestHelper.cleanupDatabase();
  });

  describe('Success Cases', () => {
    it('should successfully refresh token with valid refresh token', async () => {
      const response = await supertest(web).post('/api/refresh-token').send({
        refresh_token,
      });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Login successful');
      expect(response.body.refresh_token).toBeDefined();
      expect(response.body.user).toBeDefined();
      expect(response.body.user.email).toBe(process.env.EMAIL_ADMIN);
      expect(response.body.user.password).toBeUndefined();
      expect(response.headers['set-cookie']).toBeDefined();
    });

    it('should return new refresh token after refresh', async () => {
      const response = await supertest(web).post('/api/refresh-token').send({
        refresh_token,
      });

      expect(response.status).toBe(200);
      expect(response.body.refresh_token).toBeDefined();
      expect(response.body.refresh_token).not.toBe(refresh_token);
    });
  });

  describe('Validation Errors', () => {
    it('should reject when refresh_token is missing', async () => {
      const response = await supertest(web).post('/api/refresh-token').send({});

      expect(response.status).toBe(403);
      expect(response.body.errors).toContain('Refresh token not found');
    });

    it('should reject when refresh_token is empty', async () => {
      const response = await supertest(web).post('/api/refresh-token').send({
        refresh_token: '',
      });

      expect(response.status).toBe(403);
      expect(response.body.errors).toContain('Refresh token not found');
    });

    it('should reject when refresh_token is null', async () => {
      const response = await supertest(web).post('/api/refresh-token').send({
        refresh_token: null,
      });

      expect(response.status).toBe(403);
      expect(response.body.errors).toContain('Refresh token not found');
    });

    it('should reject invalid refresh token format', async () => {
      const invalidTokens = [
        'invalid_token_format',
        'token_with_special_chars!@#$%^&*()',
        'a'.repeat(1000),
        '   ',
      ];

      for (const token of invalidTokens) {
        const response = await supertest(web).post('/api/refresh-token').send({
          refresh_token: token,
        });

        expect(response.status).toBe(403);
        expect(response.body.errors).toContain('Refresh token not found');
      }
    });
  });

  describe('Token Reuse Protection', () => {
    it('should invalidate old refresh token after use', async () => {
      const loginResponse = await AuthLogic.getLoginSuperAdmin();
      const freshRefreshToken = loginResponse.body.refresh_token;

      // First refresh - should succeed
      const firstResponse = await supertest(web).post('/api/refresh-token').send({
        refresh_token: freshRefreshToken,
      });

      expect(firstResponse.status).toBe(200);

      // Second refresh with same token - should fail
      const secondResponse = await supertest(web).post('/api/refresh-token').send({
        refresh_token: freshRefreshToken,
      });

      expect(secondResponse.status).toBe(403);
      expect(secondResponse.body.errors).toContain('Refresh token not found');
    });
  });

  describe('Logout Integration', () => {
    it('should invalidate refresh token after logout', async () => {
      const loginResponse = await AuthLogic.getLoginSuperAdmin();
      const logoutRefreshToken = loginResponse.body.refresh_token;
      const cookies = loginResponse.headers['set-cookie'];
      const cookieHeader = Array.isArray(cookies) ? cookies.join('; ') : cookies;

      // Logout
      await supertest(web)
        .post('/api/logout')
        .set('Cookie', cookieHeader ?? '');

      // Try to refresh token after logout - should fail
      const response = await supertest(web).post('/api/refresh-token').send({
        refresh_token: logoutRefreshToken,
      });

      expect(response.status).toBe(403);
      expect(response.body.errors).toContain('Refresh token not found');
    });
  });
});
