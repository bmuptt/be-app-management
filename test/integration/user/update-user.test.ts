import dotenv from 'dotenv';
import { AccessTokenTable, AuthLogic, UserTable } from '../../test-util';
import supertest from 'supertest';
import { web } from '../../../src/config/web';
import { logger } from '../../../src/config/logging';

dotenv.config();

const baseUrlTest = '/api/app-management/user';

describe('Update User Business Flow', () => {
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

  it('Should successfully update user data', async () => {
    // First create a new user to update
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

    const updateData = {
      email: 'updated@example.com',
      name: 'Updated User',
      gender: 'Female',
      birthdate: '1995-06-15',
      role_id: 1
    };

    const response = await supertest(web)
      .patch(`${baseUrlTest}/${userId}`)
      .set('Cookie', cookieHeader ?? '')
      .send(updateData);

    logger.debug('Update user response', response.body);
    expect(response.status).toBe(200);
    expect(response.body.message).toBe('Success to edit data user.');
    expect(response.body.data).toBeDefined();
    expect(response.body.data.name).toBe(updateData.name);
    expect(response.body.data.gender).toBe(updateData.gender);
    expect(response.body.data.birthdate).toBeDefined();
    expect(response.body.data.role_id).toBe(updateData.role_id);
  });

  it('Should handle validation errors for missing required fields', async () => {
    const response = await supertest(web)
      .patch(`${baseUrlTest}/2`)
      .set('Cookie', cookieHeader ?? '')
      .send({});

    logger.debug('Missing fields validation response', response.body);
    expect(response.status).toBe(400);
    expect(response.body.errors).toContain('The email is required!');
    expect(response.body.errors).toContain('The name is required!');
    expect(response.body.errors).toContain('The gender is required!');
    expect(response.body.errors).toContain('The birthdate is required!');
    expect(response.body.errors).toContain('The role is required!');
  });

  it('Should handle validation errors for invalid email format', async () => {
    const testCases = [
      { email: 'invalid-email', expectedError: 'Invalid email' },
      { email: 'test@', expectedError: 'Invalid email' },
      { email: '@example.com', expectedError: 'Invalid email' },
      { email: 'test.example.com', expectedError: 'Invalid email' },
      { email: 'test@example', expectedError: 'Invalid email' },
    ];

    for (const testCase of testCases) {
      const response = await supertest(web)
        .patch(`${baseUrlTest}/2`)
        .set('Cookie', cookieHeader ?? '')
        .send({
          email: testCase.email,
          name: 'Test User',
          gender: 'Male',
          birthdate: '1990-01-01',
          role_id: 1
        });

      logger.debug(`Email validation test: ${testCase.email}`, response.body);
      expect(response.status).toBe(400);
      expect(response.body.errors).toContain(testCase.expectedError);
    }
  });

  it('Should handle validation errors for invalid birthdate format', async () => {
    const testCases = [
      { birthdate: '24-04-1995', expectedError: 'The birthdate format must be: YYYY-MM-DD!' },
      { birthdate: '1995/04/24', expectedError: 'The birthdate format must be: YYYY-MM-DD!' },
      { birthdate: '1995.04.24', expectedError: 'The birthdate format must be: YYYY-MM-DD!' },
      { birthdate: '04-24-1995', expectedError: 'The birthdate format must be: YYYY-MM-DD!' },
      { birthdate: '1995-4-24', expectedError: 'The birthdate format must be: YYYY-MM-DD!' },
    ];

    for (const testCase of testCases) {
      const response = await supertest(web)
        .patch(`${baseUrlTest}/2`)
        .set('Cookie', cookieHeader ?? '')
        .send({
          email: 'test@example.com',
          name: 'Test User',
          gender: 'Male',
          birthdate: testCase.birthdate,
          role_id: 1
        });

      logger.debug(`Birthdate validation test: ${testCase.birthdate}`, response.body);
      expect(response.status).toBe(400);
      expect(response.body.errors).toContain(testCase.expectedError);
    }
  });

  it('Should handle validation errors for empty name', async () => {
    const response = await supertest(web)
      .patch(`${baseUrlTest}/2`)
      .set('Cookie', cookieHeader ?? '')
      .send({
        email: 'test@example.com',
        name: '',
        gender: 'Male',
        birthdate: '1990-01-01',
        role_id: 1
      });

    logger.debug('Empty name validation test', response.body);
    expect(response.status).toBe(400);
    expect(response.body.errors).toContain('The name is required!');
  });

  it('Should handle validation errors for empty gender', async () => {
    const response = await supertest(web)
      .patch(`${baseUrlTest}/2`)
      .set('Cookie', cookieHeader ?? '')
      .send({
        email: 'test@example.com',
        name: 'Test User',
        gender: '',
        birthdate: '1990-01-01',
        role_id: 1
      });

    logger.debug('Empty gender validation test', response.body);
    expect(response.status).toBe(400);
    expect(response.body.errors).toContain('The gender is required!');
  });

  it('Should handle duplicate email error', async () => {
    // First create a new user
    const createResponse = await supertest(web)
      .post(baseUrlTest)
      .set('Cookie', cookieHeader ?? '')
      .send({
        email: 'testuser2@example.com',
        name: 'Test User 2',
        gender: 'Male',
        birthdate: '1990-01-01',
        role_id: 1
      });

    expect(createResponse.status).toBe(200);
    const userId = createResponse.body.data.id;

    const response = await supertest(web)
      .patch(`${baseUrlTest}/${userId}`)
      .set('Cookie', cookieHeader ?? '')
      .send({
        email: process.env.EMAIL_ADMIN || 'admin@gmail.com',
        name: 'Test User',
        gender: 'Male',
        birthdate: '1990-01-01',
        role_id: 1
      });

    logger.debug('Duplicate email response', response.body);
    expect(response.status).toBe(400);
    expect(response.body.errors).toContain('The email cannot be the same!');
  });

  it('Should handle non-existent user ID', async () => {
    const response = await supertest(web)
      .patch(`${baseUrlTest}/999`)
      .set('Cookie', cookieHeader ?? '')
      .send({
        email: 'test@example.com',
        name: 'Test User',
        gender: 'Male',
        birthdate: '1990-01-01',
        role_id: 1
      });

    logger.debug('Non-existent user response', response.body);
    expect(response.status).toBe(404);
    expect(response.body.errors).toContain('The user does not exist!');
  });

  it('Should handle different gender values', async () => {
    const testCases = [
      { gender: 'Male', name: 'Male User' },
      { gender: 'Female', name: 'Female User' },
    ];

    for (const testCase of testCases) {
      // Create a new user for each test case
      const createResponse = await supertest(web)
        .post(baseUrlTest)
        .set('Cookie', cookieHeader ?? '')
        .send({
          email: `test${testCase.gender.toLowerCase()}@example.com`,
          name: 'Original User',
          gender: 'Male',
          birthdate: '1990-01-01',
          role_id: 1
        });

      expect(createResponse.status).toBe(200);
      const userId = createResponse.body.data.id;

      const response = await supertest(web)
        .patch(`${baseUrlTest}/${userId}`)
        .set('Cookie', cookieHeader ?? '')
        .send({
          email: `test${testCase.gender.toLowerCase()}@example.com`,
          name: testCase.name,
          gender: testCase.gender,
          birthdate: '1990-01-01',
          role_id: 1
        });

      logger.debug(`Gender test: ${testCase.gender}`, response.body);
      expect(response.status).toBe(200);
      expect(response.body.data.gender).toBe(testCase.gender);
      expect(response.body.data.name).toBe(testCase.name);
    }
  });

  it('Should handle various valid birthdate formats', async () => {
    const testCases = [
      { birthdate: '1990-01-01', name: 'User 1990' },
      { birthdate: '1995-12-31', name: 'User 1995' },
      { birthdate: '2000-06-15', name: 'User 2000' },
      { birthdate: '1985-03-20', name: 'User 1985' },
    ];

    for (const testCase of testCases) {
      // Create a new user for each test case
      const createResponse = await supertest(web)
        .post(baseUrlTest)
        .set('Cookie', cookieHeader ?? '')
        .send({
          email: `test${testCase.name.replace(' ', '').toLowerCase()}@example.com`,
          name: 'Original User',
          gender: 'Male',
          birthdate: '1990-01-01',
          role_id: 1
        });

      expect(createResponse.status).toBe(200);
      const userId = createResponse.body.data.id;

      const response = await supertest(web)
        .patch(`${baseUrlTest}/${userId}`)
        .set('Cookie', cookieHeader ?? '')
        .send({
          email: `test${testCase.name.replace(' ', '').toLowerCase()}@example.com`,
          name: testCase.name,
          gender: 'Male',
          birthdate: testCase.birthdate,
          role_id: 1
        });

      logger.debug(`Birthdate test: ${testCase.birthdate}`, response.body);
      expect(response.status).toBe(200);
      expect(response.body.data.name).toBe(testCase.name);
      expect(response.body.data.birthdate).toBeDefined();
    }
  });

  it('Should handle special characters in name', async () => {
    const specialNames = [
      'José María',
      'Jean-Pierre',
      'O\'Connor',
      'Smith-Jones',
      '李小明',
      'محمد أحمد',
    ];

    for (let i = 0; i < specialNames.length; i++) {
      const name = specialNames[i];
      // Create a new user for each test case
      const createResponse = await supertest(web)
        .post(baseUrlTest)
        .set('Cookie', cookieHeader ?? '')
        .send({
          email: `test${i}@example.com`,
          name: 'Original User',
          gender: 'Male',
          birthdate: '1990-01-01',
          role_id: 1
        });

      expect(createResponse.status).toBe(200);
      const userId = createResponse.body.data.id;

      const response = await supertest(web)
        .patch(`${baseUrlTest}/${userId}`)
        .set('Cookie', cookieHeader ?? '')
        .send({
          email: `test${i}@example.com`,
          name: name,
          gender: 'Male',
          birthdate: '1990-01-01',
          role_id: 1
        });

      logger.debug(`Special name test: ${name}`, response.body);
      expect(response.status).toBe(200);
      expect(response.body.data.name).toBe(name);
    }
  });

  it('Should handle different role assignments', async () => {
    const testCases = [
      { role_id: 1, name: 'Role 1 User' },
    ];

    for (const testCase of testCases) {
      // Create a new user for each test case
      const createResponse = await supertest(web)
        .post(baseUrlTest)
        .set('Cookie', cookieHeader ?? '')
        .send({
          email: `testrole${testCase.role_id}@example.com`,
          name: 'Original User',
          gender: 'Male',
          birthdate: '1990-01-01',
          role_id: 1
        });

      expect(createResponse.status).toBe(200);
      const userId = createResponse.body.data.id;

      const response = await supertest(web)
        .patch(`${baseUrlTest}/${userId}`)
        .set('Cookie', cookieHeader ?? '')
        .send({
          email: `testrole${testCase.role_id}@example.com`,
          name: testCase.name,
          gender: 'Male',
          birthdate: '1990-01-01',
          role_id: testCase.role_id
        });

      logger.debug(`Role test: ${testCase.role_id}`, response.body);
      expect(response.status).toBe(200);
      expect(response.body.data.role_id).toBe(testCase.role_id);
      expect(response.body.data.name).toBe(testCase.name);
    }
  });

  it('Should ignore additional fields in request body', async () => {
    // Create a new user first
    const createResponse = await supertest(web)
      .post(baseUrlTest)
      .set('Cookie', cookieHeader ?? '')
      .send({
        email: 'testadditional@example.com',
        name: 'Original User',
        gender: 'Male',
        birthdate: '1990-01-01',
        role_id: 1
      });

    expect(createResponse.status).toBe(200);
    const userId = createResponse.body.data.id;

    const response = await supertest(web)
      .patch(`${baseUrlTest}/${userId}`)
      .set('Cookie', cookieHeader ?? '')
      .send({
        email: 'testadditional@example.com',
        name: 'Test User',
        gender: 'Male',
        birthdate: '1990-01-01',
        role_id: 1,
        additional_field: 'should be ignored',
        another_field: 123,
        password: 'should not be updated'
      });

    logger.debug('Additional fields test', response.body);
    expect(response.status).toBe(200);
    expect(response.body.data.name).toBe('Test User');
    // Additional fields should not affect the update
  });

  it('Should handle concurrent update requests', async () => {
    // Create a new user first
    const createResponse = await supertest(web)
      .post(baseUrlTest)
      .set('Cookie', cookieHeader ?? '')
      .send({
        email: 'concurrent@example.com',
        name: 'Original User',
        gender: 'Male',
        birthdate: '1990-01-01',
        role_id: 1
      });

    expect(createResponse.status).toBe(200);
    const userId = createResponse.body.data.id;

    const updateData = {
      email: 'concurrent@example.com',
      name: 'Concurrent User',
      gender: 'Male',
      birthdate: '1990-01-01',
      role_id: 1
    };

    // Make multiple concurrent requests
    const promises = [
      supertest(web)
        .patch(`${baseUrlTest}/${userId}`)
        .set('Cookie', cookieHeader ?? '')
        .send(updateData),
      supertest(web)
        .patch(`${baseUrlTest}/${userId}`)
        .set('Cookie', cookieHeader ?? '')
        .send({ ...updateData, name: 'Concurrent User 2' }),
      supertest(web)
        .patch(`${baseUrlTest}/${userId}`)
        .set('Cookie', cookieHeader ?? '')
        .send({ ...updateData, name: 'Concurrent User 3' })
    ];

    const responses = await Promise.all(promises);

    // All requests should succeed
    responses.forEach((response, index) => {
      logger.debug(`Concurrent update ${index + 1}`, response.body);
      expect(response.status).toBe(200);
      expect(response.body.data).toBeDefined();
    });
  });
});
