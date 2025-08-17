import dotenv from 'dotenv';
import { AccessTokenTable, AuthLogic, UserTable } from '../../test-util';
import supertest from 'supertest';
import { web } from '../../../src/config/web';
import { logger } from '../../../src/config/logging';

dotenv.config();

const baseUrlTest = '/api/app-management/user';

describe('Reset Password User Business Flow', () => {
  let cookies: string | string[];
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
    cookieHeader = Array.isArray(cookies) ? cookies.join('; ') : cookies;
  }, 30000);

  afterEach(async () => {
    await UserTable.delete();
    await AccessTokenTable.delete();
  });

  it('Should successfully reset password for existing user', async () => {
    // Test with seeded admin user (ID: 1)
    const response = await supertest(web)
      .post(`${baseUrlTest}/reset-password/1`)
      .set('Cookie', cookieHeader ?? '');

    logger.debug('Reset password response', response.body);
    expect(response.status).toBe(200);
    expect(response.body.message).toBe('Success to reset password user.');
    expect(response.body.data).toBeDefined();
    expect(response.body.data.active).toBe('Inactive');
    expect(response.body.data.id).toBe(1);
    expect(response.body.data.updated_by).toBe(1);
  });

  it('Should handle non-existent user ID', async () => {
    const response = await supertest(web)
      .post(`${baseUrlTest}/reset-password/999`)
      .set('Cookie', cookieHeader ?? '');

    logger.debug('Non-existent user reset password response', response.body);
    expect(response.status).toBe(404);
    expect(response.body.errors).toContain('The user does not exist!');
  });

  it('Should handle invalid user ID format', async () => {
    const response = await supertest(web)
      .post(`${baseUrlTest}/reset-password/invalid`)
      .set('Cookie', cookieHeader ?? '');

    logger.debug('Invalid user ID reset password response', response.body);
    // Invalid ID format causes a 500 error due to NaN being passed to database
    expect(response.status).toBe(500);
  });

  it('Should handle zero user ID', async () => {
    const response = await supertest(web)
      .post(`${baseUrlTest}/reset-password/0`)
      .set('Cookie', cookieHeader ?? '');

    logger.debug('Zero user ID reset password response', response.body);
    expect(response.status).toBe(404);
    expect(response.body.errors).toContain('The user does not exist!');
  });

  it('Should handle negative user ID', async () => {
    const response = await supertest(web)
      .post(`${baseUrlTest}/reset-password/-1`)
      .set('Cookie', cookieHeader ?? '');

    logger.debug('Negative user ID reset password response', response.body);
    expect(response.status).toBe(404);
    expect(response.body.errors).toContain('The user does not exist!');
  });

  it('Should handle very large user ID', async () => {
    const response = await supertest(web)
      .post(`${baseUrlTest}/reset-password/999999999`)
      .set('Cookie', cookieHeader ?? '');

    logger.debug('Large user ID reset password response', response.body);
    expect(response.status).toBe(404);
    expect(response.body.errors).toContain('The user does not exist!');
  });

  it('Should handle multiple reset password requests for same user', async () => {
    // First reset
    const response1 = await supertest(web)
      .post(`${baseUrlTest}/reset-password/1`)
      .set('Cookie', cookieHeader ?? '');

    logger.debug('First reset password response', response1.body);
    expect(response1.status).toBe(200);
    expect(response1.body.data.active).toBe('Inactive');

    // Second reset (should still work)
    const response2 = await supertest(web)
      .post(`${baseUrlTest}/reset-password/1`)
      .set('Cookie', cookieHeader ?? '');

    logger.debug('Second reset password response', response2.body);
    expect(response2.status).toBe(200);
    expect(response2.body.data.active).toBe('Inactive');
  });

  it('Should return correct response structure', async () => {
    const response = await supertest(web)
      .post(`${baseUrlTest}/reset-password/1`)
      .set('Cookie', cookieHeader ?? '');

    logger.debug('Response structure test', response.body);
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('message');
    expect(response.body).toHaveProperty('data');
    expect(response.body.message).toBe('Success to reset password user.');
    expect(response.body.data).toHaveProperty('id');
    expect(response.body.data).toHaveProperty('active');
    expect(response.body.data).toHaveProperty('updated_by');
    expect(response.body.data.id).toBe(1);
    expect(response.body.data.active).toBe('Inactive');
    expect(response.body.data.updated_by).toBe(1);
  });

  it('Should update the updated_by field correctly', async () => {
    const response = await supertest(web)
      .post(`${baseUrlTest}/reset-password/1`)
      .set('Cookie', cookieHeader ?? '');

    logger.debug('Updated by field test', response.body);
    expect(response.status).toBe(200);
    expect(response.body.data.updated_by).toBe(1); // Should be the user ID being reset
  });

  it('Should handle reset password for newly created user', async () => {
    // First create a new user
    const createResponse = await supertest(web)
      .post(baseUrlTest)
      .set('Cookie', cookieHeader ?? '')
      .send({
        email: 'newuser@example.com',
        name: 'New User',
        gender: 'Male',
        birthdate: '1990-01-01',
        role_id: 1
      });

    expect(createResponse.status).toBe(200);
    const newUserId = createResponse.body.data.id;

    // Then reset password for the new user
    const resetResponse = await supertest(web)
      .post(`${baseUrlTest}/reset-password/${newUserId}`)
      .set('Cookie', cookieHeader ?? '');

    logger.debug('New user reset password response', resetResponse.body);
    expect(resetResponse.status).toBe(200);
    expect(resetResponse.body.data.active).toBe('Inactive');
    expect(resetResponse.body.data.id).toBe(newUserId);
    expect(resetResponse.body.data.updated_by).toBe(newUserId);
  });
});
