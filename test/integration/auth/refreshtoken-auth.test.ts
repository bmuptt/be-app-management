import dotenv from 'dotenv';
import { AccessTokenTable, AuthLogic, UserTable } from '../../test-util';
import supertest from 'supertest';
import { web } from '../../../src/config/web';
import { logger } from '../../../src/config/logging';

dotenv.config();

describe('Refresh Token Authentication', () => {
  let cookies: string | string[];
  let refresh_token: string | null;
  let cookieHeader: string | null;

  beforeEach(async () => {
    await UserTable.delete();
    await AccessTokenTable.delete();
    await UserTable.resetUserIdSequence();
    await AccessTokenTable.resetAccessTokenIdSequence();
    await UserTable.callUserSeed();

    const responseLogin = await AuthLogic.getLoginSuperAdmin();
    expect(responseLogin.status).toBe(200);

    cookies = responseLogin.headers['set-cookie'];
    refresh_token = responseLogin.body.refresh_token;
    cookieHeader = Array.isArray(cookies) ? cookies.join('; ') : cookies;
  }, 30000);

  afterEach(async () => {
    await UserTable.delete();
    await AccessTokenTable.delete();
  });

  it('Should successfully refresh token with valid refresh token', async () => {
    const response = await supertest(web)
      .post('/api/refresh-token')
      .send({
        refresh_token,
      });

    logger.debug('Refresh token success', response.body);
    expect(response.status).toBe(200);
    expect(response.body.message).toBe('Login successful');
    expect(response.body.refresh_token).toBeDefined();
    expect(response.body.user).toBeDefined();
    expect(response.body.user.email).toBe(process.env.EMAIL_ADMIN);
    expect(response.body.user.password).toBeUndefined();
    expect(response.headers['set-cookie']).toBeDefined();
  });

  it('Should handle missing refresh token in request body', async () => {
    const response = await supertest(web)
      .post('/api/refresh-token')
      .send({});

    logger.debug('Refresh token missing token', response.body);
    expect(response.status).toBe(403);
    expect(response.body.errors).toContain('Refresh token not found');
  });

  it('Should handle empty refresh token string', async () => {
    const response = await supertest(web)
      .post('/api/refresh-token')
      .send({
        refresh_token: '',
      });

    logger.debug('Refresh token empty string', response.body);
    expect(response.status).toBe(403);
    expect(response.body.errors).toContain('Refresh token not found');
  });

  it('Should handle null refresh token', async () => {
    const response = await supertest(web)
      .post('/api/refresh-token')
      .send({
        refresh_token: null,
      });

    logger.debug('Refresh token null value', response.body);
    expect(response.status).toBe(403);
    expect(response.body.errors).toContain('Refresh token not found');
  });

  it('Should handle invalid refresh token format', async () => {
    const response = await supertest(web)
      .post('/api/refresh-token')
      .send({
        refresh_token: 'invalid_token_format',
      });

    logger.debug('Refresh token invalid format', response.body);
    expect(response.status).toBe(403);
    expect(response.body.errors).toContain('Refresh token not found');
  });

  it('Should handle refresh token with special characters', async () => {
    const response = await supertest(web)
      .post('/api/refresh-token')
      .send({
        refresh_token: 'token_with_special_chars!@#$%^&*()',
      });

    logger.debug('Refresh token special characters', response.body);
    expect(response.status).toBe(403);
    expect(response.body.errors).toContain('Refresh token not found');
  });

  it('Should handle refresh token that has already been used', async () => {
    // First refresh - should succeed
    const firstResponse = await supertest(web)
      .post('/api/refresh-token')
      .send({
        refresh_token,
      });

    expect(firstResponse.status).toBe(200);

    // Second refresh with same token - should fail
    const secondResponse = await supertest(web)
      .post('/api/refresh-token')
      .send({
        refresh_token,
      });

    logger.debug('Refresh token already used', secondResponse.body);
    expect(secondResponse.status).toBe(403);
    expect(secondResponse.body.errors).toContain('Refresh token not found');
  });

  it('Should handle refresh token with different HTTP methods', async () => {
    // Test GET method (should fail)
    const getResponse = await supertest(web)
      .get('/api/refresh-token')
      .send({
        refresh_token,
      });

    logger.debug('Refresh token GET method', getResponse.body);
    expect(getResponse.status).toBe(404);

    // Test PUT method (should fail)
    const putResponse = await supertest(web)
      .put('/api/refresh-token')
      .send({
        refresh_token,
      });

    logger.debug('Refresh token PUT method', putResponse.body);
    expect(putResponse.status).toBe(404);

    // Test DELETE method (should fail)
    const deleteResponse = await supertest(web)
      .delete('/api/refresh-token')
      .send({
        refresh_token,
      });

    logger.debug('Refresh token DELETE method', deleteResponse.body);
    expect(deleteResponse.status).toBe(404);

    // Test PATCH method (should fail)
    const patchResponse = await supertest(web)
      .patch('/api/refresh-token')
      .send({
        refresh_token,
      });

    logger.debug('Refresh token PATCH method', patchResponse.body);
    expect(patchResponse.status).toBe(404);
  });

  it('Should handle refresh token with additional fields in request body', async () => {
    const response = await supertest(web)
      .post('/api/refresh-token')
      .send({
        refresh_token,
        extra_field: 'should be ignored',
        another_field: 123,
        nested_field: { key: 'value' },
      });

    logger.debug('Refresh token with extra fields', response.body);
    expect(response.status).toBe(200);
    expect(response.body.message).toBe('Login successful');
    expect(response.body.refresh_token).toBeDefined();
    expect(response.body.user).toBeDefined();
  });

  it('Should handle refresh token with query parameters', async () => {
    const response = await supertest(web)
      .post('/api/refresh-token?include=extra&data=test')
      .send({
        refresh_token,
      });

    logger.debug('Refresh token with query parameters', response.body);
    expect(response.status).toBe(200);
    expect(response.body.message).toBe('Login successful');
    expect(response.body.refresh_token).toBeDefined();
    expect(response.body.user).toBeDefined();
  });

  it('Should handle refresh token with additional headers', async () => {
    const response = await supertest(web)
      .post('/api/refresh-token')
      .set('User-Agent', 'Test-Agent')
      .set('Accept', 'application/json')
      .set('Content-Type', 'application/json')
      .send({
        refresh_token,
      });

    logger.debug('Refresh token with additional headers', response.body);
    expect(response.status).toBe(200);
    expect(response.body.message).toBe('Login successful');
    expect(response.body.refresh_token).toBeDefined();
    expect(response.body.user).toBeDefined();
  });

  it('Should handle multiple sequential refresh token requests', async () => {
    // First refresh - should succeed
    const firstResponse = await supertest(web)
      .post('/api/refresh-token')
      .send({
        refresh_token,
      });

    expect(firstResponse.status).toBe(200);
    expect(firstResponse.body.message).toBe('Login successful');
    expect(firstResponse.body.refresh_token).toBeDefined();
    expect(firstResponse.body.user).toBeDefined();

    // Second refresh with same token - should fail
    const secondResponse = await supertest(web)
      .post('/api/refresh-token')
      .send({
        refresh_token,
      });

    logger.debug('Second refresh token request', secondResponse.body);
    expect(secondResponse.status).toBe(403);
    expect(secondResponse.body.errors).toContain('Refresh token not found');

    // Third refresh with same token - should also fail
    const thirdResponse = await supertest(web)
      .post('/api/refresh-token')
      .send({
        refresh_token,
      });

    logger.debug('Third refresh token request', thirdResponse.body);
    expect(thirdResponse.status).toBe(403);
    expect(thirdResponse.body.errors).toContain('Refresh token not found');
  });

  it('Should handle refresh token after user logout', async () => {
    // First, logout the user
    const logoutResponse = await supertest(web)
      .post('/api/logout')
      .set('Cookie', cookieHeader ?? '');

    expect(logoutResponse.status).toBe(200);

    // Then try to refresh token - should fail because logout invalidates the refresh token
    const refreshResponse = await supertest(web)
      .post('/api/refresh-token')
      .send({
        refresh_token,
      });

    logger.debug('Refresh token after logout', refreshResponse.body);
    expect(refreshResponse.status).toBe(403);
    expect(refreshResponse.body.errors).toContain('Refresh token not found');
  });

  it('Should handle refresh token with very long token string', async () => {
    const longToken = 'a'.repeat(1000);
    const response = await supertest(web)
      .post('/api/refresh-token')
      .send({
        refresh_token: longToken,
      });

    logger.debug('Refresh token very long string', response.body);
    expect(response.status).toBe(403);
    expect(response.body.errors).toContain('Refresh token not found');
  });

  it('Should handle refresh token with whitespace-only token', async () => {
    const response = await supertest(web)
      .post('/api/refresh-token')
      .send({
        refresh_token: '   ',
      });

    logger.debug('Refresh token whitespace only', response.body);
    expect(response.status).toBe(403);
    expect(response.body.errors).toContain('Refresh token not found');
  });
});
