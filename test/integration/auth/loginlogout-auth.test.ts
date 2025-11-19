import dotenv from 'dotenv';
import { TestHelper, AuthLogic } from '../../test-util';
import supertest from 'supertest';
import { web } from '../../../src/config/web';

dotenv.config();

describe('Auth Login Logout', () => {
  beforeEach(async () => {
    await TestHelper.refreshDatabase();
  });

  afterEach(async () => {
    await TestHelper.cleanupDatabase();
  });

  describe('Login - Validation', () => {
    it('should reject login with empty email and password', async () => {
      const response = await supertest(web).post('/api/login').send({
        email: '',
        password: '',
      });

      expect(response.status).toBe(400);
      expect(response.body.errors).toEqual(
        expect.arrayContaining([
          'Invalid email',
          'Email is required',
          'Password is required',
        ]),
      );
    });

    it('should reject login with invalid email format', async () => {
      const response = await supertest(web).post('/api/login').send({
        email: 'invalid-email',
        password: 'test123',
      });

      expect(response.status).toBe(400);
      expect(response.body.errors).toContain('Invalid email');
    });

    it('should reject login with non-existent user', async () => {
      const response = await supertest(web).post('/api/login').send({
        email: 'nonexistent@example.com',
        password: 'test123',
      });

      expect(response.status).toBe(400);
      expect(response.body.errors).toContain('Email or password is incorrect!');
    });

    it('should reject login with wrong password', async () => {
      const response = await supertest(web).post('/api/login').send({
        email: process.env.EMAIL_ADMIN,
        password: 'wrongpassword',
      });

      expect(response.status).toBe(400);
      expect(response.body.errors).toContain('Email or password is incorrect!');
    });
  });

  describe('Login - Success', () => {
    it('should successfully login with valid credentials', async () => {
      const response = await AuthLogic.getLoginSuperAdmin();

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('refresh_token');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.email).toBe(process.env.EMAIL_ADMIN);
      expect(response.body.user.password).toBeUndefined();
      expect(response.headers['set-cookie']).toBeDefined();
    });

    it('should set httpOnly cookie with token on successful login', async () => {
      const response = await AuthLogic.getLoginSuperAdmin();

      expect(response.status).toBe(200);
      const cookies = response.headers['set-cookie'];
      expect(cookies).toBeDefined();
      
      const cookieString = Array.isArray(cookies) ? cookies.join('; ') : cookies;
      expect(cookieString).toContain('token=');
      expect(cookieString).toContain('HttpOnly');
    });
  });

  describe('Logout', () => {
    it('should reject logout without authentication', async () => {
      const response = await supertest(web).post('/api/logout');

      expect(response.status).toBe(401);
    });

    it('should successfully logout with valid authentication', async () => {
      const loginResponse = await AuthLogic.getLoginSuperAdmin();
      const cookies = loginResponse.headers['set-cookie'];
      const cookieHeader = Array.isArray(cookies) ? cookies.join('; ') : cookies;

      const logoutResponse = await supertest(web)
        .post('/api/logout')
        .set('Cookie', cookieHeader ?? '');

      expect(logoutResponse.status).toBe(200);
      expect(logoutResponse.body.message).toBe('Logout successful');
    });

    it('should invalidate session after logout', async () => {
      const loginResponse = await AuthLogic.getLoginSuperAdmin();
      const cookies = loginResponse.headers['set-cookie'];
      const cookieHeader = Array.isArray(cookies) ? cookies.join('; ') : cookies;

      // Logout
      await supertest(web)
        .post('/api/logout')
        .set('Cookie', cookieHeader ?? '');

      // Try to access protected endpoint with invalidated session
      const profileResponse = await supertest(web)
        .get('/api/profile')
        .set('Cookie', cookieHeader ?? '');

      expect(profileResponse.status).toBe(401);
    });
  });

  describe('Login-Logout Cycle', () => {
    it('should handle multiple login-logout cycles successfully', async () => {
      for (let i = 0; i < 3; i++) {
        // Login
        const loginResponse = await AuthLogic.getLoginSuperAdmin();
        expect(loginResponse.status).toBe(200);

        const cookies = loginResponse.headers['set-cookie'];
        const cookieHeader = Array.isArray(cookies) ? cookies.join('; ') : cookies;

        // Logout
        const logoutResponse = await supertest(web)
          .post('/api/logout')
          .set('Cookie', cookieHeader ?? '');
        expect(logoutResponse.status).toBe(200);
      }
    });
  });
});
