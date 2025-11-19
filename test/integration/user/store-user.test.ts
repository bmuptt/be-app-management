import dotenv from 'dotenv';
import { TestHelper, AuthLogic } from '../../test-util';
import supertest from 'supertest';
import { web } from '../../../src/config/web';

dotenv.config();

const baseUrlTest = '/api/app-management/user';

describe('Store User', () => {
  let cookieHeader: string | null;

  beforeEach(async () => {
    await TestHelper.refreshDatabase();

    const loginResponse = await AuthLogic.getLoginSuperAdmin();
    const cookies = loginResponse.headers['set-cookie'];
    cookieHeader = Array.isArray(cookies) ? cookies.join('; ') : cookies;
  });

  afterEach(async () => {
    await TestHelper.cleanupDatabase();
  });

  describe('Authentication', () => {
    it('should reject store user request without authentication', async () => {
      const response = await supertest(web).post(baseUrlTest).send({
        email: 'test@example.com',
        name: 'Test User',
        gender: 'Male',
        birthdate: '1990-01-01',
        role_id: 1,
      });

      expect(response.status).toBe(401);
    });
  });

  describe('Validation - Required Fields', () => {
    it('should reject when all required fields are missing', async () => {
      const response = await supertest(web)
        .post(baseUrlTest)
        .set('Cookie', cookieHeader ?? '')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.errors).toEqual(
        expect.arrayContaining([
          'The email is required!',
          'The name is required!',
          'The gender is required!',
          'The birthdate is required!',
        ]),
      );
    });

    it('should reject when email is missing', async () => {
      const response = await supertest(web)
        .post(baseUrlTest)
        .set('Cookie', cookieHeader ?? '')
        .send({
          name: 'Test User',
          gender: 'Male',
          birthdate: '1990-01-01',
          role_id: 1,
        });

      expect(response.status).toBe(400);
      expect(response.body.errors).toContain('The email is required!');
    });

    it('should reject when name is missing', async () => {
      const response = await supertest(web)
        .post(baseUrlTest)
        .set('Cookie', cookieHeader ?? '')
        .send({
          email: 'test@example.com',
          gender: 'Male',
          birthdate: '1990-01-01',
          role_id: 1,
        });

      expect(response.status).toBe(400);
      expect(response.body.errors).toContain('The name is required!');
    });

    it('should reject when gender is missing', async () => {
      const response = await supertest(web)
        .post(baseUrlTest)
        .set('Cookie', cookieHeader ?? '')
        .send({
          email: 'test@example.com',
          name: 'Test User',
          birthdate: '1990-01-01',
          role_id: 1,
        });

      expect(response.status).toBe(400);
      expect(response.body.errors).toContain('The gender is required!');
    });

    it('should reject when birthdate is missing', async () => {
      const response = await supertest(web)
        .post(baseUrlTest)
        .set('Cookie', cookieHeader ?? '')
        .send({
          email: 'test@example.com',
          name: 'Test User',
          gender: 'Male',
          role_id: 1,
        });

      expect(response.status).toBe(400);
      expect(response.body.errors).toContain('The birthdate is required!');
    });

    it('should reject when role_id is missing', async () => {
      const response = await supertest(web)
        .post(baseUrlTest)
        .set('Cookie', cookieHeader ?? '')
        .send({
          email: 'test@example.com',
          name: 'Test User',
          gender: 'Male',
          birthdate: '1990-01-01',
        });

      expect(response.status).toBe(400);
      expect(response.body.errors).toContain('The role is required!');
    });
  });

  describe('Validation - Email', () => {
    it('should reject invalid email formats', async () => {
      const invalidEmails = [
        'invalid-email',
        'test@',
        '@example.com',
        'test.example.com',
        'test@example',
      ];

      for (const email of invalidEmails) {
        const response = await supertest(web)
          .post(baseUrlTest)
          .set('Cookie', cookieHeader ?? '')
          .send({
            email,
            name: 'Test User',
            gender: 'Male',
            birthdate: '1990-01-01',
            role_id: 1,
          });

        expect(response.status).toBe(400);
        expect(response.body.errors).toContain('Invalid email');
      }
    });

    it('should reject duplicate email', async () => {
      const userData = {
        email: 'duplicate@example.com',
        name: 'First User',
        gender: 'Male',
        birthdate: '1990-01-01',
        role_id: 1,
      };

      // Create first user
      await supertest(web)
        .post(baseUrlTest)
        .set('Cookie', cookieHeader ?? '')
        .send(userData);

      // Try to create second user with same email
      const response = await supertest(web)
        .post(baseUrlTest)
        .set('Cookie', cookieHeader ?? '')
        .send({
          ...userData,
          name: 'Second User',
        });

      expect(response.status).toBe(400);
      expect(response.body.errors).toContain('The email cannot be the same!');
    });
  });

  describe('Validation - Birthdate', () => {
    it('should reject invalid birthdate formats', async () => {
      const invalidDates = [
        'invalid-date',
        '1990/01/01',
        '01-01-1990',
        '1990-13-01',
        '1990-01-32',
        '1990-00-01',
        '1990-01-00',
      ];

      for (const birthdate of invalidDates) {
        const response = await supertest(web)
          .post(baseUrlTest)
          .set('Cookie', cookieHeader ?? '')
          .send({
            email: 'test@example.com',
            name: 'Test User',
            gender: 'Male',
            birthdate,
            role_id: 1,
          });

        expect(response.status).toBe(400);
        expect(response.body.errors).toContain('The birthdate format must be: YYYY-MM-DD!');
      }
    });

    it('should accept valid birthdate formats', async () => {
      const validDates = [
        { birthdate: '1990-01-01', name: 'User1990' },
        { birthdate: '2000-12-31', name: 'User2000' },
        { birthdate: '1985-06-15', name: 'User1985' },
        { birthdate: '2020-02-29', name: 'User2020' }, // Leap year
      ];

      for (const testCase of validDates) {
        const response = await supertest(web)
          .post(baseUrlTest)
          .set('Cookie', cookieHeader ?? '')
          .send({
            email: `test${testCase.name}@example.com`,
            name: testCase.name,
            gender: 'Male',
            birthdate: testCase.birthdate,
            role_id: 1,
          });

        expect(response.status).toBe(200);
        expect(response.body.data.birthdate).toContain(testCase.birthdate);
        expect(response.body.data.name).toBe(testCase.name);
      }
    });
  });

  describe('Validation - Gender', () => {
    it('should accept valid gender values', async () => {
      const validGenders = ['Male', 'Female'];

      for (const gender of validGenders) {
        const response = await supertest(web)
          .post(baseUrlTest)
          .set('Cookie', cookieHeader ?? '')
          .send({
            email: `test${gender.toLowerCase()}@example.com`,
            name: `${gender} User`,
            gender,
            birthdate: '1990-01-01',
            role_id: 1,
          });

        expect(response.status).toBe(200);
        expect(response.body.data.gender).toBe(gender);
      }
    });
  });

  describe('Validation - Role', () => {
    it('should reject when role does not exist', async () => {
      const response = await supertest(web)
        .post(baseUrlTest)
        .set('Cookie', cookieHeader ?? '')
        .send({
          email: 'test@example.com',
          name: 'Test User',
          gender: 'Male',
          birthdate: '1990-01-01',
          role_id: 999,
        });

      expect(response.status).toBe(400);
      expect(response.body.errors).toContain('The role is not found!');
    });

    it('should accept valid role_id', async () => {
      const response = await supertest(web)
        .post(baseUrlTest)
        .set('Cookie', cookieHeader ?? '')
        .send({
          email: 'test@example.com',
          name: 'Test User',
          gender: 'Male',
          birthdate: '1990-01-01',
          role_id: 1,
        });

      expect(response.status).toBe(200);
      expect(response.body.data.role_id).toBe(1);
    });
  });

  describe('Success Cases', () => {
    it('should successfully create user with valid data', async () => {
      const userData = {
        email: 'newuser@example.com',
        name: 'New User',
        gender: 'Male',
        birthdate: '1990-01-01',
        role_id: 1,
      };

      const response = await supertest(web)
        .post(baseUrlTest)
        .set('Cookie', cookieHeader ?? '')
        .send(userData);

      expect(response.status).toBe(200);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.email).toBe(userData.email);
      expect(response.body.data.name).toBe(userData.name);
      expect(response.body.data.gender).toBe(userData.gender);
      expect(response.body.data.birthdate).toContain(userData.birthdate);
      expect(response.body.data.role_id).toBe(userData.role_id);
      expect(response.body.data.active).toBe('Active');
      expect(response.body.data.id).toBeDefined();
    });

    it('should set created_by to current user', async () => {
      const userData = {
        email: 'test@example.com',
        name: 'Test User',
        gender: 'Male',
        birthdate: '1990-01-01',
        role_id: 1,
      };

      const response = await supertest(web)
        .post(baseUrlTest)
        .set('Cookie', cookieHeader ?? '')
        .send(userData);

      expect(response.status).toBe(200);
      expect(response.body.data.created_by).toBe(1); // Admin user ID
    });

    it('should accept special characters in name', async () => {
      const specialNames = [
        { name: 'John-Doe', gender: 'Male' },
        { name: "O'Connor", gender: 'Male' },
        { name: 'Mary Jane', gender: 'Female' },
      ];

      for (const testCase of specialNames) {
        const response = await supertest(web)
          .post(baseUrlTest)
          .set('Cookie', cookieHeader ?? '')
          .send({
            email: `test${testCase.name.replace(/\s+/g, '')}@example.com`,
            name: testCase.name,
            gender: testCase.gender,
            birthdate: '1990-01-01',
            role_id: 1,
          });

        expect(response.status).toBe(200);
        expect(response.body.data.name).toBe(testCase.name);
        expect(response.body.data.gender).toBe(testCase.gender);
      }
    });
  });

  describe('Data Integrity', () => {
    it('should ignore extra fields in request', async () => {
      const userData = {
        email: 'test@example.com',
        name: 'Test User',
        gender: 'Male',
        birthdate: '1990-01-01',
        role_id: 1,
        extra_field: 'should be ignored',
        another_field: 123,
      };

      const response = await supertest(web)
        .post(baseUrlTest)
        .set('Cookie', cookieHeader ?? '')
        .send(userData);

      expect(response.status).toBe(200);
      expect(response.body.data.email).toBe(userData.email);
      expect(response.body.data.extra_field).toBeUndefined();
      expect(response.body.data.another_field).toBeUndefined();
    });
  });
});
