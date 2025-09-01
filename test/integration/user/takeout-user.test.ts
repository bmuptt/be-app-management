import dotenv from 'dotenv';
import { TestHelper, AuthLogic } from '../../test-util';
import supertest from 'supertest';
import { web } from '../../../src/config/web';
import { logger } from '../../../src/config/logging';

dotenv.config();

const baseUrlTest = '/api/app-management/user';

describe('Take Out User Business Flow', () => {
  let cookieHeader: string | null;

  beforeEach(async () => {
    // Increase timeout for database operations
    jest.setTimeout(30000);
    // Migrate dan seed ulang database untuk setiap test case
    await TestHelper.refreshDatabase();

    const responseLogin = await AuthLogic.getLoginSuperAdmin();
    expect(responseLogin.status).toBe(200);

    const cookies = responseLogin.headers['set-cookie'];
    cookieHeader = Array.isArray(cookies) ? cookies.join('; ') : cookies;
  });

  afterEach(async () => {
    // Cleanup database setelah test
    await TestHelper.cleanupDatabase();
  });

  it('Should handle complete take out user flow including validation, edge cases, and response structure', async () => {
    // Increase timeout for this comprehensive test
    jest.setTimeout(30000);

    // ===== TEST 1: SUCCESSFUL TAKE OUT EXISTING USER =====
    console.log('🧪 Testing successful take out existing user...');

    // First create a new user to take out
    const createResponse = await supertest(web)
      .post(baseUrlTest)
      .set('Cookie', cookieHeader ?? '')
      .send({
        email: 'testuser@example.com',
        name: 'Test User',
        gender: 'Male',
        birthdate: '1990-01-01',
        role_id: 1,
      });

    expect(createResponse.status).toBe(200);
    const userId = createResponse.body.data.id;

    const response = await supertest(web)
      .post(`${baseUrlTest}/take-out/${userId}`)
      .set('Cookie', cookieHeader ?? '');

    expect(response.status).toBe(200);
    expect(response.body.message).toBe('Success to reset password user.');
    expect(response.body.data).toBeDefined();
    expect(response.body.data.active).toBe('Take Out');
    expect(response.body.data.id).toBe(userId);

    // ===== TEST 2: NON-EXISTENT USER ID =====
    console.log('🧪 Testing non-existent user ID...');

    const nonExistentResponse = await supertest(web)
      .post(`${baseUrlTest}/take-out/999`)
      .set('Cookie', cookieHeader ?? '');

    expect(nonExistentResponse.status).toBe(404);
    expect(nonExistentResponse.body.errors).toContain(
      'The user does not exist!',
    );

    // ===== TEST 3: INVALID USER ID FORMAT =====
    console.log('🧪 Testing invalid user ID format...');

    const invalidFormatResponse = await supertest(web)
      .post(`${baseUrlTest}/take-out/invalid`)
      .set('Cookie', cookieHeader ?? '');

    expect(invalidFormatResponse.status).toBe(500);
    // The error message will be from Prisma about invalid ID format

    // ===== TEST 4: ZERO USER ID =====
    console.log('🧪 Testing zero user ID...');

    const zeroResponse = await supertest(web)
      .post(`${baseUrlTest}/take-out/0`)
      .set('Cookie', cookieHeader ?? '');

    expect(zeroResponse.status).toBe(404);
    expect(zeroResponse.body.errors).toContain('The user does not exist!');

    // ===== TEST 5: NEGATIVE USER ID =====
    console.log('🧪 Testing negative user ID...');

    const negativeResponse = await supertest(web)
      .post(`${baseUrlTest}/take-out/-1`)
      .set('Cookie', cookieHeader ?? '');

    expect(negativeResponse.status).toBe(404);
    expect(negativeResponse.body.errors).toContain('The user does not exist!');

    // ===== TEST 6: VERY LARGE USER ID =====
    console.log('🧪 Testing very large user ID...');

    const largeResponse = await supertest(web)
      .post(`${baseUrlTest}/take-out/999999999`)
      .set('Cookie', cookieHeader ?? '');

    expect(largeResponse.status).toBe(404);
    expect(largeResponse.body.errors).toContain('The user does not exist!');

    // ===== TEST 7: TAKE OUT ADMIN USER =====
    console.log('🧪 Testing take out admin user...');

    const adminResponse = await supertest(web)
      .post(`${baseUrlTest}/take-out/1`)
      .set('Cookie', cookieHeader ?? '');

    expect(adminResponse.status).toBe(200);
    expect(adminResponse.body.message).toBe('Success to reset password user.');
    expect(adminResponse.body.data).toBeDefined();
    expect(adminResponse.body.data.active).toBe('Take Out');
    expect(adminResponse.body.data.id).toBe(1);

    // ===== TEST 8: MULTIPLE TAKE OUT REQUESTS FOR SAME USER =====
    console.log('🧪 Testing multiple take out requests for same user...');

    // First create a new user
    const createResponse2 = await supertest(web)
      .post(baseUrlTest)
      .set('Cookie', cookieHeader ?? '')
      .send({
        email: 'testuser2@example.com',
        name: 'Test User 2',
        gender: 'Female',
        birthdate: '1995-05-15',
        role_id: 1,
      });

    expect(createResponse2.status).toBe(200);
    const userId2 = createResponse2.body.data.id;

    // First take out
    const response1 = await supertest(web)
      .post(`${baseUrlTest}/take-out/${userId2}`)
      .set('Cookie', cookieHeader ?? '');

    expect(response1.status).toBe(200);
    expect(response1.body.data.active).toBe('Take Out');

    // Second take out (should still work)
    const response2 = await supertest(web)
      .post(`${baseUrlTest}/take-out/${userId2}`)
      .set('Cookie', cookieHeader ?? '');

    expect(response2.status).toBe(200);
    expect(response2.body.data.active).toBe('Take Out');

    // ===== TEST 9: CONCURRENT TAKE OUT REQUESTS =====
    console.log('🧪 Testing concurrent take out requests...');

    // First create a new user
    const createResponse3 = await supertest(web)
      .post(baseUrlTest)
      .set('Cookie', cookieHeader ?? '')
      .send({
        email: 'testuser3@example.com',
        name: 'Test User 3',
        gender: 'Male',
        birthdate: '1988-12-25',
        role_id: 1,
      });

    expect(createResponse3.status).toBe(200);
    const userId3 = createResponse3.body.data.id;

    // Make multiple concurrent requests
    const promises = [
      supertest(web)
        .post(`${baseUrlTest}/take-out/${userId3}`)
        .set('Cookie', cookieHeader ?? ''),
      supertest(web)
        .post(`${baseUrlTest}/take-out/${userId3}`)
        .set('Cookie', cookieHeader ?? ''),
      supertest(web)
        .post(`${baseUrlTest}/take-out/${userId3}`)
        .set('Cookie', cookieHeader ?? ''),
    ];

    const concurrentResponses = await Promise.all(promises);

    // All requests should succeed
    concurrentResponses.forEach((response, index) => {
      expect(response.status).toBe(200);
      expect(response.body.data.active).toBe('Take Out');
    });

    // ===== TEST 10: RESPONSE STRUCTURE =====
    console.log('🧪 Testing response structure...');

    // First create a new user
    const createResponse4 = await supertest(web)
      .post(baseUrlTest)
      .set('Cookie', cookieHeader ?? '')
      .send({
        email: 'testuser4@example.com',
        name: 'Test User 4',
        gender: 'Female',
        birthdate: '1992-03-20',
        role_id: 1,
      });

    expect(createResponse4.status).toBe(200);
    const userId4 = createResponse4.body.data.id;

    const structureResponse = await supertest(web)
      .post(`${baseUrlTest}/take-out/${userId4}`)
      .set('Cookie', cookieHeader ?? '');

    expect(structureResponse.status).toBe(200);
    expect(structureResponse.body).toHaveProperty('message');
    expect(structureResponse.body).toHaveProperty('data');
    expect(structureResponse.body.message).toBe(
      'Success to reset password user.',
    );
    expect(structureResponse.body.data).toHaveProperty('id');
    expect(structureResponse.body.data).toHaveProperty('active');
    expect(structureResponse.body.data).toHaveProperty('updated_by');

    // ===== TEST 11: UPDATE THE UPDATED_BY FIELD CORRECTLY =====
    console.log('🧪 Testing update the updated_by field correctly...');

    // First create a new user
    const createResponse5 = await supertest(web)
      .post(baseUrlTest)
      .set('Cookie', cookieHeader ?? '')
      .send({
        email: 'testuser5@example.com',
        name: 'Test User 5',
        gender: 'Male',
        birthdate: '1985-07-10',
        role_id: 1,
      });

    expect(createResponse5.status).toBe(200);
    const userId5 = createResponse5.body.data.id;

    const updatedByResponse = await supertest(web)
      .post(`${baseUrlTest}/take-out/${userId5}`)
      .set('Cookie', cookieHeader ?? '');

    expect(updatedByResponse.status).toBe(200);
    expect(updatedByResponse.body.data.updated_by).toBe(userId5); // Should be the user ID being taken out

    // ===== TEST 12: TAKE OUT FOR NEWLY CREATED USER =====
    console.log('🧪 Testing take out for newly created user...');

    // First create a new user
    const createResponse6 = await supertest(web)
      .post(baseUrlTest)
      .set('Cookie', cookieHeader ?? '')
      .send({
        email: 'newuser@example.com',
        name: 'New User',
        gender: 'Male',
        birthdate: '1990-01-01',
        role_id: 1,
      });

    expect(createResponse6.status).toBe(200);
    const newUserId = createResponse6.body.data.id;

    // Then take out the new user
    const newUserResponse = await supertest(web)
      .post(`${baseUrlTest}/take-out/${newUserId}`)
      .set('Cookie', cookieHeader ?? '');

    expect(newUserResponse.status).toBe(200);
    expect(newUserResponse.body.data.active).toBe('Take Out');
    expect(newUserResponse.body.data.id).toBe(newUserId);

    // ===== TEST 13: TAKE OUT FOR MULTIPLE USERS =====
    console.log('🧪 Testing take out for multiple users...');

    // Create multiple users first
    const users = [
      {
        email: 'user1@example.com',
        name: 'User One',
        gender: 'Male',
        birthdate: '1990-01-01',
        role_id: 1,
      },
      {
        email: 'user2@example.com',
        name: 'User Two',
        gender: 'Female',
        birthdate: '1995-05-15',
        role_id: 1,
      },
      {
        email: 'user3@example.com',
        name: 'User Three',
        gender: 'Male',
        birthdate: '1988-12-25',
        role_id: 1,
      },
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

      expect(takeOutResponse.status).toBe(200);
      expect(takeOutResponse.body.data.active).toBe('Take Out');
      expect(takeOutResponse.body.data.id).toBe(userId);
    }

    // ===== TEST 14: TAKE OUT AFTER USER HAS BEEN RESET =====
    console.log('🧪 Testing take out after user has been reset...');

    // First create a new user
    const createResponse7 = await supertest(web)
      .post(baseUrlTest)
      .set('Cookie', cookieHeader ?? '')
      .send({
        email: 'resetuser@example.com',
        name: 'Reset User',
        gender: 'Female',
        birthdate: '1993-09-15',
        role_id: 1,
      });

    expect(createResponse7.status).toBe(200);
    const resetUserId = createResponse7.body.data.id;

    // First reset the user
    const resetResponse = await supertest(web)
      .post(`${baseUrlTest}/reset-password/${resetUserId}`)
      .set('Cookie', cookieHeader ?? '');

    expect(resetResponse.status).toBe(200);
    expect(resetResponse.body.data.active).toBe('Inactive');

    // Then take out the user
    const takeOutAfterResetResponse = await supertest(web)
      .post(`${baseUrlTest}/take-out/${resetUserId}`)
      .set('Cookie', cookieHeader ?? '');

    expect(takeOutAfterResetResponse.status).toBe(200);
    expect(takeOutAfterResetResponse.body.data.active).toBe('Take Out');

    console.log('✅ All take out user flow tests completed successfully');
  });
});
