import dotenv from 'dotenv';
import { AccessTokenTable, AuthLogic, UserTable } from '../../test-util';
import supertest from 'supertest';
import { web } from '../../../src/config/web';
import { logger } from '../../../src/config/logging';

dotenv.config();

describe('Edit Profile Business Flow', () => {
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

  it('Should successfully edit profile with valid data', async () => {
    const updateData = {
      name: 'Updated Admin Name',
      gender: 'Male',
      birthdate: '1990-01-01'
    };

    const response = await supertest(web)
      .patch('/api/edit-profile')
      .set('Cookie', cookieHeader ?? '')
      .send(updateData);

    logger.debug('Profile edit success', response.body);
    expect(response.status).toBe(200);
    expect(response.body.message).toBe('Success to edit data user.');
    expect(response.body.data).toBeDefined();
    expect(response.body.data.name).toBe(updateData.name);
    expect(response.body.data.gender).toBe(updateData.gender);
    expect(response.body.data.birthdate).toContain(updateData.birthdate);
    expect(response.body.data.email).toBe(process.env.EMAIL_ADMIN);
  });

  it('Should handle validation errors for missing required fields', async () => {
    const testCases = [
      { 
        data: {}, 
        expectedErrors: ['The name is required!', 'The gender is required!', 'The birthdate is required!'] 
      },
      { 
        data: { name: 'Test Name' }, 
        expectedErrors: ['The gender is required!', 'The birthdate is required!'] 
      },
      { 
        data: { name: 'Test Name', gender: 'Male' }, 
        expectedErrors: ['The birthdate is required!'] 
      },
      { 
        data: { name: '', gender: 'Male', birthdate: '1990-01-01' }, 
        expectedErrors: ['The name must be at least 2 characters!'] 
      },
      { 
        data: { name: 'Test Name', gender: '', birthdate: '1990-01-01' }, 
        expectedErrors: ['The gender is required!'] 
      },
      { 
        data: { name: 'Test Name', gender: 'Male', birthdate: '' }, 
        expectedErrors: ['The birthdate format must be: YYYY-MM-DD!'] 
      },
    ];

    for (const testCase of testCases) {
      const response = await supertest(web)
        .patch('/api/edit-profile')
        .set('Cookie', cookieHeader ?? '')
        .send(testCase.data);

      logger.debug(`Profile edit validation test: ${JSON.stringify(testCase.data)}`, response.body);
      expect(response.status).toBe(400);
      expect(response.body.errors).toEqual(expect.arrayContaining(testCase.expectedErrors));
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
        .patch('/api/edit-profile')
        .set('Cookie', cookieHeader ?? '')
        .send({
          name: 'Test Name',
          gender: 'Male',
          birthdate: testCase.birthdate
        });

      logger.debug(`Profile edit birthdate validation test: ${testCase.birthdate}`, response.body);
      expect(response.status).toBe(400);
      expect(response.body.errors).toContain(testCase.expectedError);
    }
  });

  it('Should handle validation errors for invalid gender values', async () => {
    const testCases = [
      { gender: 'Invalid', expectedError: 'Gender must be either \'Male\' or \'Female\'!' },
      { gender: 'male', expectedError: 'Gender must be either \'Male\' or \'Female\'!' },
      { gender: 'female', expectedError: 'Gender must be either \'Male\' or \'Female\'!' },
      { gender: 'M', expectedError: 'Gender must be either \'Male\' or \'Female\'!' },
      { gender: 'F', expectedError: 'Gender must be either \'Male\' or \'Female\'!' },
      { gender: '1', expectedError: 'Gender must be either \'Male\' or \'Female\'!' },
      { gender: '0', expectedError: 'Gender must be either \'Male\' or \'Female\'!' },
    ];

    for (const testCase of testCases) {
      const response = await supertest(web)
        .patch('/api/edit-profile')
        .set('Cookie', cookieHeader ?? '')
        .send({
          name: 'Test Name',
          gender: testCase.gender,
          birthdate: '1990-01-01'
        });

      logger.debug(`Profile edit gender validation test: ${testCase.gender}`, response.body);
      expect(response.status).toBe(400);
      expect(response.body.errors).toContain(testCase.expectedError);
    }
  }, 15000);

  it('Should handle validation errors for name length constraints', async () => {
    const testCases = [
      { name: '', expectedError: 'The name must be at least 2 characters!' },
      { name: 'A', expectedError: 'The name must be at least 2 characters!' },
      { name: 'a'.repeat(101), expectedError: 'The name cannot exceed 100 characters!' },
    ];

    for (const testCase of testCases) {
      const response = await supertest(web)
        .patch('/api/edit-profile')
        .set('Cookie', cookieHeader ?? '')
        .send({
          name: testCase.name,
          gender: 'Male',
          birthdate: '1990-01-01'
        });

      logger.debug(`Profile edit name validation test: ${testCase.name}`, response.body);
      expect(response.status).toBe(400);
      expect(response.body.errors).toContain(testCase.expectedError);
    }
  });

  it('Should not allow email modification through edit profile', async () => {
    const originalEmail = process.env.EMAIL_ADMIN;
    const updateData = {
      name: 'Updated Admin Name',
      gender: 'Male',
      birthdate: '1990-01-01',
      email: 'newemail@example.com'
    };

    const response = await supertest(web)
      .patch('/api/edit-profile')
      .set('Cookie', cookieHeader ?? '')
      .send(updateData);

    logger.debug('Profile edit email protection', response.body);
    expect(response.status).toBe(200);
    expect(response.body.data.email).toBe(originalEmail);
    expect(response.body.data.name).toBe(updateData.name);
  });

  it('Should handle different gender values correctly', async () => {
    const testCases = [
      { gender: 'Male', name: 'Male User' },
      { gender: 'Female', name: 'Female User' },
    ];

    for (const testCase of testCases) {
      const response = await supertest(web)
        .patch('/api/edit-profile')
        .set('Cookie', cookieHeader ?? '')
        .send({
          name: testCase.name,
          gender: testCase.gender,
          birthdate: '1990-01-01'
        });

      logger.debug(`Profile edit gender test: ${testCase.gender}`, response.body);
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
        .patch('/api/edit-profile')
        .set('Cookie', cookieHeader ?? '')
        .send({
          name: testCase.name,
          gender: 'Male',
          birthdate: testCase.birthdate
        });

      logger.debug(`Profile edit birthdate test: ${testCase.birthdate}`, response.body);
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
        .patch('/api/edit-profile')
        .set('Cookie', cookieHeader ?? '')
        .send({
          name: testCase.name,
          gender: testCase.gender,
          birthdate: '1990-01-01'
        });

      logger.debug(`Profile edit special characters test: ${testCase.name}`, response.body);
      expect(response.status).toBe(200);
      expect(response.body.data.name).toBe(testCase.name);
      expect(response.body.data.gender).toBe(testCase.gender);
    }
  });

  it('Should handle concurrent profile edit requests', async () => {
    const updateData = {
      name: 'Concurrent Test User',
      gender: 'Male',
      birthdate: '1990-01-01'
    };

    const promises = Array(3).fill(null).map((_, index) =>
      supertest(web)
        .patch('/api/edit-profile')
        .set('Cookie', cookieHeader ?? '')
        .send({
          ...updateData,
          name: `ConcurrentUser${index + 1}`
        })
    );

    const responses = await Promise.all(promises);

    responses.forEach((response, index) => {
      logger.debug(`Concurrent profile edit request ${index + 1}`, response.body);
      expect(response.status).toBe(200);
      expect(response.body.data.name).toBe(`ConcurrentUser${index + 1}`);
      expect(response.body.data.gender).toBe(updateData.gender);
    });
  }, 20000);

  it('Should handle profile edit with additional fields (should be ignored)', async () => {
    const updateData = {
      name: 'Test User',
      gender: 'Male',
      birthdate: '1990-01-01',
      extra_field: 'should be ignored',
      another_field: 123,
      nested_field: { key: 'value' }
    };

    const response = await supertest(web)
      .patch('/api/edit-profile')
      .set('Cookie', cookieHeader ?? '')
      .send(updateData);

    logger.debug('Profile edit with extra fields', response.body);
    expect(response.status).toBe(200);
    expect(response.body.data.name).toBe(updateData.name);
    expect(response.body.data.gender).toBe(updateData.gender);
    expect(response.body.data.birthdate).toContain(updateData.birthdate);
    expect(response.body.data.extra_field).toBeUndefined();
    expect(response.body.data.another_field).toBeUndefined();
    expect(response.body.data.nested_field).toBeUndefined();
  }, 15000);

  it('Should handle profile edit with query parameters (should be ignored)', async () => {
    const updateData = {
      name: 'Test User',
      gender: 'Male',
      birthdate: '1990-01-01'
    };

    const response = await supertest(web)
      .patch('/api/edit-profile?include=extra&data=test')
      .set('Cookie', cookieHeader ?? '')
      .send(updateData);

    logger.debug('Profile edit with query parameters', response.body);
    expect(response.status).toBe(200);
    expect(response.body.data.name).toBe(updateData.name);
    expect(response.body.data.gender).toBe(updateData.gender);
  });
});
