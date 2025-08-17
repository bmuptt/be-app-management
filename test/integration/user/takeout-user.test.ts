import dotenv from 'dotenv';
import { AccessTokenTable, AuthLogic, UserTable } from '../../test-util';
import supertest from 'supertest';
import { web } from '../../../src/config/web';
import { logger } from '../../../src/config/logging';

dotenv.config();

const baseUrlTest = '/api/app-management/user';

describe('Take Out User Business Flow', () => {
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

  it('Should successfully take out existing user', async () => {
    // First create a new user to take out
    const createResponse = await supertest(web)
      .post(baseUrlTest)
      .set('Cookie', cookieHeader ?? '')
      .send({
        email: 'testuser@example.com',
        name: 'Test User',
        gender: 'Male',
        birthdate: '1990-01-01',
        role_id: 1
      });

    expect(createResponse.status).toBe(200);
    const userId = createResponse.body.data.id;

    const response = await supertest(web)
      .post(`${baseUrlTest}/take-out/${userId}`)
      .set('Cookie', cookieHeader ?? '');

    logger.debug('Take out user response', response.body);
    expect(response.status).toBe(200);
    expect(response.body.message).toBe('Success to reset password user.');
    expect(response.body.data).toBeDefined();
    expect(response.body.data.active).toBe('Take Out');
    expect(response.body.data.id).toBe(userId);
  });

  it('Should handle non-existent user ID', async () => {
    const response = await supertest(web)
      .post(`${baseUrlTest}/take-out/999`)
      .set('Cookie', cookieHeader ?? '');

    logger.debug('Non-existent user take out response', response.body);
    expect(response.status).toBe(404);
    expect(response.body.errors).toContain('The user does not exist!');
  });

  it('Should handle invalid user ID format', async () => {
    const response = await supertest(web)
      .post(`${baseUrlTest}/take-out/invalid`)
      .set('Cookie', cookieHeader ?? '');

    logger.debug('Invalid user ID take out response', response.body);
    expect(response.status).toBe(500);
    // The error message will be from Prisma about invalid ID format
  });

  it('Should handle zero user ID', async () => {
    const response = await supertest(web)
      .post(`${baseUrlTest}/take-out/0`)
      .set('Cookie', cookieHeader ?? '');

    logger.debug('Zero user ID take out response', response.body);
    expect(response.status).toBe(404);
    expect(response.body.errors).toContain('The user does not exist!');
  });

  it('Should handle negative user ID', async () => {
    const response = await supertest(web)
      .post(`${baseUrlTest}/take-out/-1`)
      .set('Cookie', cookieHeader ?? '');

    logger.debug('Negative user ID take out response', response.body);
    expect(response.status).toBe(404);
    expect(response.body.errors).toContain('The user does not exist!');
  });

  it('Should handle very large user ID', async () => {
    const response = await supertest(web)
      .post(`${baseUrlTest}/take-out/999999999`)
      .set('Cookie', cookieHeader ?? '');

    logger.debug('Large user ID take out response', response.body);
    expect(response.status).toBe(404);
    expect(response.body.errors).toContain('The user does not exist!');
  });

  it('Should take out admin user', async () => {
    const response = await supertest(web)
      .post(`${baseUrlTest}/take-out/1`)
      .set('Cookie', cookieHeader ?? '');

    logger.debug('Admin user take out response', response.body);
    expect(response.status).toBe(200);
    expect(response.body.message).toBe('Success to reset password user.');
    expect(response.body.data).toBeDefined();
    expect(response.body.data.active).toBe('Take Out');
    expect(response.body.data.id).toBe(1);
  });

  it('Should handle multiple take out requests for same user', async () => {
    // First create a new user
    const createResponse = await supertest(web)
      .post(baseUrlTest)
      .set('Cookie', cookieHeader ?? '')
      .send({
        email: 'testuser2@example.com',
        name: 'Test User 2',
        gender: 'Female',
        birthdate: '1995-05-15',
        role_id: 1
      });

    expect(createResponse.status).toBe(200);
    const userId = createResponse.body.data.id;

    // First take out
    const response1 = await supertest(web)
      .post(`${baseUrlTest}/take-out/${userId}`)
      .set('Cookie', cookieHeader ?? '');

    logger.debug('First take out response', response1.body);
    expect(response1.status).toBe(200);
    expect(response1.body.data.active).toBe('Take Out');

    // Second take out (should still work)
    const response2 = await supertest(web)
      .post(`${baseUrlTest}/take-out/${userId}`)
      .set('Cookie', cookieHeader ?? '');

    logger.debug('Second take out response', response2.body);
    expect(response2.status).toBe(200);
    expect(response2.body.data.active).toBe('Take Out');
  });

  it('Should handle concurrent take out requests', async () => {
    // First create a new user
    const createResponse = await supertest(web)
      .post(baseUrlTest)
      .set('Cookie', cookieHeader ?? '')
      .send({
        email: 'testuser3@example.com',
        name: 'Test User 3',
        gender: 'Male',
        birthdate: '1988-12-25',
        role_id: 1
      });

    expect(createResponse.status).toBe(200);
    const userId = createResponse.body.data.id;

    // Make multiple concurrent requests
    const promises = [
      supertest(web)
        .post(`${baseUrlTest}/take-out/${userId}`)
        .set('Cookie', cookieHeader ?? ''),
      supertest(web)
        .post(`${baseUrlTest}/take-out/${userId}`)
        .set('Cookie', cookieHeader ?? ''),
      supertest(web)
        .post(`${baseUrlTest}/take-out/${userId}`)
        .set('Cookie', cookieHeader ?? '')
    ];

    const responses = await Promise.all(promises);

    // All requests should succeed
    responses.forEach((response, index) => {
      logger.debug(`Concurrent take out ${index + 1}`, response.body);
      expect(response.status).toBe(200);
      expect(response.body.data.active).toBe('Take Out');
    });
  });

  it('Should return correct response structure', async () => {
    // First create a new user
    const createResponse = await supertest(web)
      .post(baseUrlTest)
      .set('Cookie', cookieHeader ?? '')
      .send({
        email: 'testuser4@example.com',
        name: 'Test User 4',
        gender: 'Female',
        birthdate: '1992-03-20',
        role_id: 1
      });

    expect(createResponse.status).toBe(200);
    const userId = createResponse.body.data.id;

    const response = await supertest(web)
      .post(`${baseUrlTest}/take-out/${userId}`)
      .set('Cookie', cookieHeader ?? '');

    logger.debug('Response structure test', response.body);
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('message');
    expect(response.body).toHaveProperty('data');
    expect(response.body.message).toBe('Success to reset password user.');
    expect(response.body.data).toHaveProperty('id');
    expect(response.body.data).toHaveProperty('active');
    expect(response.body.data).toHaveProperty('updated_by');
  });

  it('Should update the updated_by field correctly', async () => {
    // First create a new user
    const createResponse = await supertest(web)
      .post(baseUrlTest)
      .set('Cookie', cookieHeader ?? '')
      .send({
        email: 'testuser5@example.com',
        name: 'Test User 5',
        gender: 'Male',
        birthdate: '1985-07-10',
        role_id: 1
      });

    expect(createResponse.status).toBe(200);
    const userId = createResponse.body.data.id;

    const response = await supertest(web)
      .post(`${baseUrlTest}/take-out/${userId}`)
      .set('Cookie', cookieHeader ?? '');

    logger.debug('Updated by field test', response.body);
    expect(response.status).toBe(200);
    expect(response.body.data.updated_by).toBe(userId); // Should be the user ID being taken out
  });

  it('Should handle take out for newly created user', async () => {
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

    // Then take out the new user
    const takeOutResponse = await supertest(web)
      .post(`${baseUrlTest}/take-out/${newUserId}`)
      .set('Cookie', cookieHeader ?? '');

    logger.debug('New user take out response', takeOutResponse.body);
    expect(takeOutResponse.status).toBe(200);
    expect(takeOutResponse.body.data.active).toBe('Take Out');
    expect(takeOutResponse.body.data.id).toBe(newUserId);
  });

  it('Should handle take out for multiple users', async () => {
    // Create multiple users first
    const users = [
      {
        email: 'user1@example.com',
        name: 'User One',
        gender: 'Male',
        birthdate: '1990-01-01',
        role_id: 1
      },
      {
        email: 'user2@example.com',
        name: 'User Two',
        gender: 'Female',
        birthdate: '1995-05-15',
        role_id: 1
      },
      {
        email: 'user3@example.com',
        name: 'User Three',
        gender: 'Male',
        birthdate: '1988-12-25',
        role_id: 1
      }
    ];

    const createdUserIds: number[] = [];

    for (const userData of users) {
      const createResponse = await supertest(web)
        .post(baseUrlTest)
        .set('Cookie', cookieHeader ?? '')
        .send(userData);

      expect(createResponse.status).toBe(200);
      createdUserIds.push(createResponse.body.data.id);
    }

    // Take out all created users
    for (const userId of createdUserIds) {
      const takeOutResponse = await supertest(web)
        .post(`${baseUrlTest}/take-out/${userId}`)
        .set('Cookie', cookieHeader ?? '');

      logger.debug(`Take out user ${userId} response`, takeOutResponse.body);
      expect(takeOutResponse.status).toBe(200);
      expect(takeOutResponse.body.data.active).toBe('Take Out');
      expect(takeOutResponse.body.data.id).toBe(userId);
    }
  });

  it('Should handle take out after user has been reset', async () => {
    // First create a new user
    const createResponse = await supertest(web)
      .post(baseUrlTest)
      .set('Cookie', cookieHeader ?? '')
      .send({
        email: 'resetuser@example.com',
        name: 'Reset User',
        gender: 'Female',
        birthdate: '1993-09-15',
        role_id: 1
      });

    expect(createResponse.status).toBe(200);
    const userId = createResponse.body.data.id;

    // First reset the user
    const resetResponse = await supertest(web)
      .post(`${baseUrlTest}/reset-password/${userId}`)
      .set('Cookie', cookieHeader ?? '');

    expect(resetResponse.status).toBe(200);
    expect(resetResponse.body.data.active).toBe('Inactive');

    // Then take out the user
    const takeOutResponse = await supertest(web)
      .post(`${baseUrlTest}/take-out/${userId}`)
      .set('Cookie', cookieHeader ?? '');

    logger.debug('Take out after reset response', takeOutResponse.body);
    expect(takeOutResponse.status).toBe(200);
    expect(takeOutResponse.body.data.active).toBe('Take Out');
  });
});
