import dotenv from 'dotenv';
import { AccessTokenTable, AuthLogic, UserTable } from '../../test-util';
import supertest from 'supertest';
import { web } from '../../../src/config/web';
import { logger } from '../../../src/config/logging';

dotenv.config();

let cookies: string | string[];
let refresh_token: string | null;
let cookieHeader: string | null;

describe('Auth Login Logout Flow', () => {
  beforeEach(async () => {
    await UserTable.delete();
    await AccessTokenTable.delete();
    await UserTable.resetUserIdSequence();
    await AccessTokenTable.resetAccessTokenIdSequence();
    await UserTable.callUserSeed();
  });

  afterEach(async () => {
    await UserTable.delete();
    await AccessTokenTable.delete();
  });

  it('Should handle login error cases', async () => {
    // Test 1: Return 400 when email and password are empty
    const response1 = await supertest(web).post('/api/login').send({
      email: '',
      password: '',
    });

    logger.debug('Logger Login empty fields', response1.body);
    expect(response1.body.errors).toEqual(
      expect.arrayContaining([
        'Invalid email',
        'Email is required',
        'Password is required',
      ])
    );
    expect(response1.status).toBe(400);

    // Test 2: Return 400 when email is empty
    const response2 = await supertest(web).post('/api/login').send({
      email: '',
      password: 'test123',
    });

    logger.debug('Logger Login empty email', response2.body);
    expect(response2.body.errors).toEqual(
      expect.arrayContaining([
        'Invalid email',
        'Email is required',
      ])
    );
    expect(response2.status).toBe(400);

    // Test 3: Return 400 when password is empty
    const response3 = await supertest(web).post('/api/login').send({
      email: 'admin@arzhi.com',
      password: '',
    });

    logger.debug('Logger Login empty password', response3.body);
    expect(response3.body.errors).toEqual(
      expect.arrayContaining([
        'Password is required',
      ])
    );
    expect(response3.status).toBe(400);

    // Test 4: Return 400 when email format is invalid
    const response4 = await supertest(web).post('/api/login').send({
      email: 'invalid-email',
      password: 'test123',
    });

    logger.debug('Logger Login invalid email format', response4.body);
    expect(response4.body.errors).toEqual(
      expect.arrayContaining([
        'Invalid email',
      ])
    );
    expect(response4.status).toBe(400);

    // Test 5: Return 400 when user does not exist
    const response5 = await supertest(web).post('/api/login').send({
      email: 'nonexistent@example.com',
      password: 'test123',
    });

    logger.debug('Logger Login user not found', response5.body);
    expect(response5.status).toBe(400);
    expect(response5.body.errors).toEqual(
      expect.arrayContaining(['Email or password is incorrect!'])
    );

    // Test 6: Return 400 when password is incorrect
    const response6 = await supertest(web).post('/api/login').send({
      email: process.env.EMAIL_ADMIN,
      password: 'wrongpassword',
    });

    logger.debug('Logger Login wrong password', response6.body);
    expect(response6.status).toBe(400);
    expect(response6.body.errors).toEqual(
      expect.arrayContaining(['Email or password is incorrect!'])
    );
  });

  it('Should handle successful login flow', async () => {
    // Test 1: Successfully login with correct credentials
    const response1 = await AuthLogic.getLoginSuperAdmin();

    logger.debug('Logger Login success', response1.body);
    expect(response1.status).toBe(200);
    expect(response1.body).toHaveProperty('refresh_token');
    expect(response1.body.refresh_token).toBeDefined();
    expect(response1.headers['set-cookie']).toBeDefined();

    // Simpan cookie dan refresh token untuk test logout
    cookies = response1.headers['set-cookie'];
    refresh_token = response1.body.refresh_token;

    // Test 2: Return user data in login response
    const response2 = await AuthLogic.getLoginSuperAdmin();

    logger.debug('Logger Login user data', response2.body);
    expect(response2.status).toBe(200);
    expect(response2.body).toHaveProperty('user');
    expect(response2.body.user).toHaveProperty('id');
    expect(response2.body.user).toHaveProperty('email');
    expect(response2.body.user).toHaveProperty('name');
    expect(response2.body.user.email).toBe(process.env.EMAIL_ADMIN);

    // Test 3: Set proper cookies in login response
    const response3 = await AuthLogic.getLoginSuperAdmin();

    logger.debug('Logger Login cookies', response3.headers);
    expect(response3.status).toBe(200);
    expect(response3.headers['set-cookie']).toBeDefined();
    
    const loginCookies = response3.headers['set-cookie'];
    expect(Array.isArray(loginCookies)).toBe(true);
    expect(loginCookies.length).toBeGreaterThan(0);
  });

  it('Should handle logout flow', async () => {
    // Test 1: Return 401 when logout without authentication
    const response1 = await supertest(web).post('/api/logout');

    logger.debug('Logger Logout without auth', response1.body);
    expect(response1.status).toBe(401);

    // Test 2: Successfully logout with valid authentication
    const loginResponse = await AuthLogic.getLoginSuperAdmin();
    const loginCookies = loginResponse.headers['set-cookie'];
    const cookieHeader = Array.isArray(loginCookies)
      ? loginCookies.join('; ')
      : loginCookies;

    const response2 = await supertest(web)
      .post('/api/logout')
      .set('Cookie', cookieHeader ?? '');

    logger.debug('Logger Logout success', response2.body);
    expect(response2.status).toBe(200);
    expect(response2.body).toHaveProperty('message');

    // Test 3: Verify logout response contains success message
    logger.debug('Logger Logout message', response2.body);
    expect(response2.body.message).toBeDefined();
    expect(response2.body.message).toBe('Logout successful');
  });

  it('Should handle session invalidation after logout', async () => {
    // Login first to get cookies
    const loginResponse = await AuthLogic.getLoginSuperAdmin();
    const loginCookies = loginResponse.headers['set-cookie'];
    const cookieHeader = Array.isArray(loginCookies)
      ? loginCookies.join('; ')
      : loginCookies;

    // Logout
    await supertest(web)
      .post('/api/logout')
      .set('Cookie', cookieHeader ?? '');

    // Try to access protected endpoint with same cookies
    const profileResponse = await supertest(web)
      .get('/api/profile')
      .set('Cookie', cookieHeader ?? '');

    logger.debug('Logger Logout session invalidation', profileResponse.body);
    expect(profileResponse.status).toBe(401);
  });

  it('Should handle login-logout integration scenarios', async () => {
    // Test 1: Handle multiple login-logout cycles
    for (let i = 0; i < 3; i++) {
      // Login
      const loginResponse = await AuthLogic.getLoginSuperAdmin();
      expect(loginResponse.status).toBe(200);

      const loginCookies = loginResponse.headers['set-cookie'];
      const cookieHeader = Array.isArray(loginCookies)
        ? loginCookies.join('; ')
        : loginCookies;

      // Logout
      const logoutResponse = await supertest(web)
        .post('/api/logout')
        .set('Cookie', cookieHeader ?? '');
      expect(logoutResponse.status).toBe(200);

      logger.debug(`Logger Login-Logout cycle ${i + 1}`, {
        login: loginResponse.status,
        logout: logoutResponse.status
      });
    }

    // Test 2: Maintain session isolation between users
    // Login with admin user
    const adminLoginResponse = await AuthLogic.getLoginSuperAdmin();
    expect(adminLoginResponse.status).toBe(200);

    const adminCookies = adminLoginResponse.headers['set-cookie'];
    const adminCookieHeader = Array.isArray(adminCookies)
      ? adminCookies.join('; ')
      : adminCookies;

    // Access profile with admin session
    const adminProfileResponse = await supertest(web)
      .get('/api/profile')
      .set('Cookie', adminCookieHeader ?? '');
    expect(adminProfileResponse.status).toBe(200);

    // Logout admin
    await supertest(web)
      .post('/api/logout')
      .set('Cookie', adminCookieHeader ?? '');

    // Try to access profile with invalidated session
    const invalidProfileResponse = await supertest(web)
      .get('/api/profile')
      .set('Cookie', adminCookieHeader ?? '');
    expect(invalidProfileResponse.status).toBe(401);

    logger.debug('Logger Session isolation', {
      adminProfile: adminProfileResponse.status,
      invalidProfile: invalidProfileResponse.status
    });
  });
});