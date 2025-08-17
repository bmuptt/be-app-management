import dotenv from 'dotenv';
import { AccessTokenTable, AuthLogic, UserTable } from '../../test-util';
import supertest from 'supertest';
import { web } from '../../../src/config/web';
import { logger } from '../../../src/config/logging';

dotenv.config();

const baseUrlTest = '/api/app-management/user';

describe('Store User Business Flow', () => {
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

  it('Should successfully create user with valid data', async () => {
    const userData = {
      email: 'newuser@example.com',
      name: 'New User',
      gender: 'Male',
      birthdate: '1990-01-01',
      role_id: 1
    };

    const response = await supertest(web)
      .post(baseUrlTest)
      .set('Cookie', cookieHeader ?? '')
      .send(userData);

    logger.debug('Success to create user', response.body);
    expect(response.status).toBe(200);
    expect(response.body.data).toBeDefined();
    expect(response.body.data.email).toBe(userData.email);
    expect(response.body.data.name).toBe(userData.name);
    expect(response.body.data.gender).toBe(userData.gender);
    expect(response.body.data.birthdate).toContain(userData.birthdate);
    expect(response.body.data.role_id).toBe(userData.role_id);
  });

  it('Should handle validation errors for missing required fields', async () => {
    const testCases = [
      { 
        data: {}, 
        expectedErrors: ['The email is required!', 'The name is required!', 'The gender is required!', 'The birthdate is required!'] 
      },
      { 
        data: { email: 'test@example.com' }, 
        expectedErrors: ['The name is required!', 'The gender is required!', 'The birthdate is required!'] 
      },
      { 
        data: { email: 'test@example.com', name: 'Test User' }, 
        expectedErrors: ['The gender is required!', 'The birthdate is required!'] 
      },
      { 
        data: { email: 'test@example.com', name: 'Test User', gender: 'Male' }, 
        expectedErrors: ['The birthdate is required!'] 
      },
    ];

    for (const testCase of testCases) {
      const response = await supertest(web)
        .post(baseUrlTest)
        .set('Cookie', cookieHeader ?? '')
        .send(testCase.data);

      logger.debug(`Validation test: ${JSON.stringify(testCase.data)}`, response.body);
      expect(response.status).toBe(400);
      expect(response.body.errors).toEqual(expect.arrayContaining(testCase.expectedErrors));
    }
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
        .post(baseUrlTest)
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
      { birthdate: 'invalid-date', expectedError: 'The birthdate format must be: YYYY-MM-DD!' },
      { birthdate: '1990/01/01', expectedError: 'The birthdate format must be: YYYY-MM-DD!' },
      { birthdate: '01-01-1990', expectedError: 'The birthdate format must be: YYYY-MM-DD!' },
      { birthdate: '1990-13-01', expectedError: 'The birthdate format must be: YYYY-MM-DD!' },
      { birthdate: '1990-01-32', expectedError: 'The birthdate format must be: YYYY-MM-DD!' },
      { birthdate: '1990-00-01', expectedError: 'The birthdate format must be: YYYY-MM-DD!' },
      { birthdate: '1990-01-00', expectedError: 'The birthdate format must be: YYYY-MM-DD!' },
    ];

    for (const testCase of testCases) {
      const response = await supertest(web)
        .post(baseUrlTest)
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

  it('Should handle validation errors for empty gender', async () => {
    const response = await supertest(web)
      .post(baseUrlTest)
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

  it('Should handle validation errors for empty name', async () => {
    const response = await supertest(web)
      .post(baseUrlTest)
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

  it('Should handle duplicate email error', async () => {
    // First, create a user
    const userData = {
      email: 'duplicate@example.com',
      name: 'First User',
      gender: 'Male',
      birthdate: '1990-01-01',
      role_id: 1
    };

    await supertest(web)
      .post(baseUrlTest)
      .set('Cookie', cookieHeader ?? '')
      .send(userData);

    // Try to create another user with the same email
    const response = await supertest(web)
      .post(baseUrlTest)
      .set('Cookie', cookieHeader ?? '')
      .send({
        email: 'duplicate@example.com',
        name: 'Second User',
        gender: 'Female',
        birthdate: '1995-05-05',
        role_id: 1
      });

    logger.debug('Duplicate email test', response.body);
    expect(response.status).toBe(400);
    expect(response.body.errors).toContain('The email cannot be the same!');
  });

  it('Should handle different gender values correctly', async () => {
    const testCases = [
      { gender: 'Male', name: 'Male User' },
      { gender: 'Female', name: 'Female User' },
    ];

    for (const testCase of testCases) {
      const response = await supertest(web)
        .post(baseUrlTest)
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

  it('Should handle various valid birthdate formats and ranges', async () => {
    const testCases = [
      { birthdate: '1990-01-01', name: 'User1990' },
      { birthdate: '2000-12-31', name: 'User2000' },
      { birthdate: '1985-06-15', name: 'User1985' },
      { birthdate: '2020-02-29', name: 'User2020' }, // Leap year
    ];

    for (const testCase of testCases) {
      const response = await supertest(web)
        .post(baseUrlTest)
        .set('Cookie', cookieHeader ?? '')
        .send({
          email: `test${testCase.name}@example.com`,
          name: testCase.name,
          gender: 'Male',
          birthdate: testCase.birthdate,
          role_id: 1
        });

      logger.debug(`Birthdate test: ${testCase.birthdate}`, response.body);
      expect(response.status).toBe(200);
      expect(response.body.data.birthdate).toContain(testCase.birthdate);
      expect(response.body.data.name).toBe(testCase.name);
    }
  });

  it('Should handle special characters in name field', async () => {
    const testCases = [
      { name: 'John-Doe', gender: 'Male' },
      { name: "O'Connor", gender: 'Male' },
      { name: 'Mary Jane', gender: 'Female' },
    ];

    for (const testCase of testCases) {
      const response = await supertest(web)
        .post(baseUrlTest)
        .set('Cookie', cookieHeader ?? '')
        .send({
          email: `test${testCase.name.replace(/\s+/g, '')}@example.com`,
          name: testCase.name,
          gender: testCase.gender,
          birthdate: '1990-01-01',
          role_id: 1
        });

      logger.debug(`Special characters test: ${testCase.name}`, response.body);
      expect(response.status).toBe(200);
      expect(response.body.data.name).toBe(testCase.name);
      expect(response.body.data.gender).toBe(testCase.gender);
    }
  });

  it('Should handle concurrent user creation requests', async () => {
    const userData = {
      gender: 'Male',
      birthdate: '1990-01-01',
      role_id: 1
    };

    const promises = Array(3).fill(null).map((_, index) =>
      supertest(web)
        .post(baseUrlTest)
        .set('Cookie', cookieHeader ?? '')
        .send({
          ...userData,
          email: `concurrent${index + 1}@example.com`,
          name: `ConcurrentUser${index + 1}`
        })
    );

    const responses = await Promise.all(promises);

    responses.forEach((response, index) => {
      logger.debug(`Concurrent user creation ${index + 1}`, response.body);
      expect(response.status).toBe(200);
      expect(response.body.data.name).toBe(`ConcurrentUser${index + 1}`);
      expect(response.body.data.email).toBe(`concurrent${index + 1}@example.com`);
    });
  });

  it('Should handle user creation with additional fields (should be ignored)', async () => {
    const userData = {
      email: 'test@example.com',
      name: 'Test User',
      gender: 'Male',
      birthdate: '1990-01-01',
      role_id: 1,
      extra_field: 'should be ignored',
      another_field: 123,
      nested_field: { key: 'value' }
    };

    const response = await supertest(web)
      .post(baseUrlTest)
      .set('Cookie', cookieHeader ?? '')
      .send(userData);

    logger.debug('User creation with extra fields', response.body);
    expect(response.status).toBe(200);
    expect(response.body.data.email).toBe(userData.email);
    expect(response.body.data.name).toBe(userData.name);
    expect(response.body.data.gender).toBe(userData.gender);
    expect(response.body.data.extra_field).toBeUndefined();
    expect(response.body.data.another_field).toBeUndefined();
    expect(response.body.data.nested_field).toBeUndefined();
  });

  it('Should handle user creation with query parameters (should be ignored)', async () => {
    const userData = {
      email: 'test@example.com',
      name: 'Test User',
      gender: 'Male',
      birthdate: '1990-01-01',
      role_id: 1
    };

    const response = await supertest(web)
      .post(`${baseUrlTest}?include=extra&data=test`)
      .set('Cookie', cookieHeader ?? '')
      .send(userData);

    logger.debug('User creation with query parameters', response.body);
    expect(response.status).toBe(200);
    expect(response.body.data.email).toBe(userData.email);
    expect(response.body.data.name).toBe(userData.name);
  });

  it('Should handle different role assignments', async () => {
    const testCases = [
      { role_id: 1, name: 'Role1User' },
      { role_id: 1, name: 'Role1User2' }, // Same role, different user
    ];

    for (const testCase of testCases) {
      const response = await supertest(web)
        .post(baseUrlTest)
        .set('Cookie', cookieHeader ?? '')
        .send({
          email: `test${testCase.name}@example.com`,
          name: testCase.name,
          gender: 'Male',
          birthdate: '1990-01-01',
          role_id: testCase.role_id
        });

      logger.debug(`Role assignment test: ${testCase.role_id}`, response.body);
      expect(response.status).toBe(200);
      expect(response.body.data.role_id).toBe(testCase.role_id);
      expect(response.body.data.name).toBe(testCase.name);
    }
  });
});
