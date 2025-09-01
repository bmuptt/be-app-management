import dotenv from 'dotenv';
import { TestHelper, AuthLogic } from '../../test-util';
import supertest from 'supertest';
import { web } from '../../../src/config/web';
import { logger } from '../../../src/config/logging';

dotenv.config();

describe('Auth Login Logout Flow', () => {
  beforeEach(async () => {
    // Migrate dan seed ulang database untuk setiap test case
    await TestHelper.refreshDatabase();
  });

  afterEach(async () => {
    // Cleanup database setelah test
    await TestHelper.cleanupDatabase();
  });

  it('Should handle complete auth flow including login errors, success login, logout, and session management', async () => {
    // ===== TEST 1: LOGIN ERROR CASES =====
    console.log('🧪 Testing login error cases...');

    // Empty email and password
    const emptyFieldsResponse = await supertest(web).post('/api/login').send({
      email: '',
      password: '',
    });
    expect(emptyFieldsResponse.status).toBe(400);
    expect(emptyFieldsResponse.body.errors).toEqual(
      expect.arrayContaining([
        'Invalid email',
        'Email is required',
        'Password is required',
      ]),
    );

    // Empty email only
    const emptyEmailResponse = await supertest(web).post('/api/login').send({
      email: '',
      password: 'test123',
    });
    expect(emptyEmailResponse.status).toBe(400);
    expect(emptyEmailResponse.body.errors).toEqual(
      expect.arrayContaining(['Invalid email', 'Email is required']),
    );

    // Empty password only
    const emptyPasswordResponse = await supertest(web).post('/api/login').send({
      email: 'admin@arzhi.com',
      password: '',
    });
    expect(emptyPasswordResponse.status).toBe(400);
    expect(emptyPasswordResponse.body.errors).toEqual(
      expect.arrayContaining(['Password is required']),
    );

    // Invalid email format
    const invalidEmailResponse = await supertest(web).post('/api/login').send({
      email: 'invalid-email',
      password: 'test123',
    });
    expect(invalidEmailResponse.status).toBe(400);
    expect(invalidEmailResponse.body.errors).toEqual(
      expect.arrayContaining(['Invalid email']),
    );

    // User not found
    const userNotFoundResponse = await supertest(web).post('/api/login').send({
      email: 'nonexistent@example.com',
      password: 'test123',
    });
    expect(userNotFoundResponse.status).toBe(400);
    expect(userNotFoundResponse.body.errors).toEqual(
      expect.arrayContaining(['Email or password is incorrect!']),
    );

    // Wrong password
    const wrongPasswordResponse = await supertest(web).post('/api/login').send({
      email: process.env.EMAIL_ADMIN,
      password: 'wrongpassword',
    });
    expect(wrongPasswordResponse.status).toBe(400);
    expect(wrongPasswordResponse.body.errors).toEqual(
      expect.arrayContaining(['Email or password is incorrect!']),
    );

    // ===== TEST 2: SUCCESSFUL LOGIN =====
    console.log('🧪 Testing successful login...');

    const loginResponse = await AuthLogic.getLoginSuperAdmin();
    expect(loginResponse.status).toBe(200);
    expect(loginResponse.body).toHaveProperty('refresh_token');
    expect(loginResponse.body).toHaveProperty('user');
    expect(loginResponse.body.user.email).toBe(process.env.EMAIL_ADMIN);
    expect(loginResponse.headers['set-cookie']).toBeDefined();

    const loginCookies = loginResponse.headers['set-cookie'];
    const cookieHeader = Array.isArray(loginCookies)
      ? loginCookies.join('; ')
      : loginCookies;

    // ===== TEST 3: LOGOUT FLOW =====
    console.log('🧪 Testing logout flow...');

    // Logout without authentication should fail
    const logoutWithoutAuthResponse = await supertest(web).post('/api/logout');
    expect(logoutWithoutAuthResponse.status).toBe(401);

    // Successful logout with valid authentication
    const logoutResponse = await supertest(web)
      .post('/api/logout')
      .set('Cookie', cookieHeader ?? '');
    expect(logoutResponse.status).toBe(200);
    expect(logoutResponse.body.message).toBe('Logout successful');

    // ===== TEST 4: SESSION INVALIDATION =====
    console.log('🧪 Testing session invalidation...');

    // Try to access protected endpoint with invalidated session
    const profileResponse = await supertest(web)
      .get('/api/profile')
      .set('Cookie', cookieHeader ?? '');
    expect(profileResponse.status).toBe(401);

    // ===== TEST 5: MULTIPLE LOGIN-LOGOUT CYCLES =====
    console.log('🧪 Testing multiple login-logout cycles...');

    for (let i = 0; i < 3; i++) {
      // Login
      const cycleLoginResponse = await AuthLogic.getLoginSuperAdmin();
      expect(cycleLoginResponse.status).toBe(200);

      const cycleCookies = cycleLoginResponse.headers['set-cookie'];
      const cycleCookieHeader = Array.isArray(cycleCookies)
        ? cycleCookies.join('; ')
        : cycleCookies;

      // Logout
      const cycleLogoutResponse = await supertest(web)
        .post('/api/logout')
        .set('Cookie', cycleCookieHeader ?? '');
      expect(cycleLogoutResponse.status).toBe(200);
    }

    console.log('✅ All auth flow tests completed successfully');
  });
});
