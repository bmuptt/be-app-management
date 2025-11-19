import dotenv from 'dotenv';
import { TestHelper, AuthLogic } from '../../test-util';
import supertest from 'supertest';
import { web } from '../../../src/config/web';

dotenv.config();

describe('Edit Profile', () => {
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
    it('should reject edit profile without authentication', async () => {
      const response = await supertest(web)
        .patch('/api/edit-profile')
        .send({
          name: 'Test Name',
          gender: 'Male',
          birthdate: '1990-01-01',
        });

      expect(response.status).toBe(401);
    });
  });

  describe('Validation - Required Fields', () => {
    it('should reject when all required fields are missing', async () => {
      const response = await supertest(web)
        .patch('/api/edit-profile')
        .set('Cookie', cookieHeader ?? '')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.errors).toEqual(
        expect.arrayContaining([
          'The name is required!',
          'The gender is required!',
          'The birthdate is required!',
        ]),
      );
    });

    it('should reject when name is missing', async () => {
      const response = await supertest(web)
        .patch('/api/edit-profile')
        .set('Cookie', cookieHeader ?? '')
        .send({
          gender: 'Male',
          birthdate: '1990-01-01',
        });

      expect(response.status).toBe(400);
      expect(response.body.errors).toContain('The name is required!');
    });

    it('should reject when gender is missing', async () => {
      const response = await supertest(web)
        .patch('/api/edit-profile')
        .set('Cookie', cookieHeader ?? '')
        .send({
          name: 'Test Name',
          birthdate: '1990-01-01',
        });

      expect(response.status).toBe(400);
      expect(response.body.errors).toContain('The gender is required!');
    });

    it('should reject when birthdate is missing', async () => {
      const response = await supertest(web)
        .patch('/api/edit-profile')
        .set('Cookie', cookieHeader ?? '')
        .send({
          name: 'Test Name',
          gender: 'Male',
        });

      expect(response.status).toBe(400);
      expect(response.body.errors).toContain('The birthdate is required!');
    });
  });

  describe('Validation - Name', () => {
    it('should reject when name is empty', async () => {
      const response = await supertest(web)
        .patch('/api/edit-profile')
        .set('Cookie', cookieHeader ?? '')
        .send({
          name: '',
          gender: 'Male',
          birthdate: '1990-01-01',
        });

      expect(response.status).toBe(400);
      expect(response.body.errors).toContain('The name must be at least 2 characters!');
    });

    it('should reject when name is too short', async () => {
      const response = await supertest(web)
        .patch('/api/edit-profile')
        .set('Cookie', cookieHeader ?? '')
        .send({
          name: 'A',
          gender: 'Male',
          birthdate: '1990-01-01',
        });

      expect(response.status).toBe(400);
      expect(response.body.errors).toContain('The name must be at least 2 characters!');
    });

    it('should reject when name is too long', async () => {
      const response = await supertest(web)
        .patch('/api/edit-profile')
        .set('Cookie', cookieHeader ?? '')
        .send({
          name: 'a'.repeat(101),
          gender: 'Male',
          birthdate: '1990-01-01',
        });

      expect(response.status).toBe(400);
      expect(response.body.errors).toContain('The name cannot exceed 100 characters!');
    });
  });

  describe('Validation - Gender', () => {
    it('should reject invalid gender values', async () => {
      const invalidGenders = ['Invalid', 'male', 'female', 'M', 'F', '1', '0'];

      for (const gender of invalidGenders) {
        const response = await supertest(web)
          .patch('/api/edit-profile')
          .set('Cookie', cookieHeader ?? '')
          .send({
            name: 'Test Name',
            gender,
            birthdate: '1990-01-01',
          });

        expect(response.status).toBe(400);
        expect(response.body.errors).toContain("Gender must be either 'Male' or 'Female'!");
      }
    });

    it('should accept valid gender values', async () => {
      const validGenders = ['Male', 'Female'];

      for (const gender of validGenders) {
        const response = await supertest(web)
          .patch('/api/edit-profile')
          .set('Cookie', cookieHeader ?? '')
          .send({
            name: 'Test Name',
            gender,
            birthdate: '1990-01-01',
          });

        expect(response.status).toBe(200);
        expect(response.body.data.gender).toBe(gender);
      }
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
          .patch('/api/edit-profile')
          .set('Cookie', cookieHeader ?? '')
          .send({
            name: 'Test Name',
            gender: 'Male',
            birthdate,
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
          .patch('/api/edit-profile')
          .set('Cookie', cookieHeader ?? '')
          .send({
            name: testCase.name,
            gender: 'Male',
            birthdate: testCase.birthdate,
          });

        expect(response.status).toBe(200);
        expect(response.body.data.birthdate).toContain(testCase.birthdate);
        expect(response.body.data.name).toBe(testCase.name);
      }
    });
  });

  describe('Success Cases', () => {
    it('should successfully update profile with valid data', async () => {
      const updateData = {
        name: 'Updated Admin Name',
        gender: 'Male',
        birthdate: '1990-01-01',
      };

      const response = await supertest(web)
        .patch('/api/edit-profile')
        .set('Cookie', cookieHeader ?? '')
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Success to edit data user.');
      expect(response.body.data).toBeDefined();
      expect(response.body.data.name).toBe(updateData.name);
      expect(response.body.data.gender).toBe(updateData.gender);
      expect(response.body.data.birthdate).toContain(updateData.birthdate);
      expect(response.body.data.email).toBe(process.env.EMAIL_ADMIN);
    });

    it('should preserve email when updating profile', async () => {
      const originalEmail = process.env.EMAIL_ADMIN;
      const updateData = {
        name: 'Updated Name',
        gender: 'Male',
        birthdate: '1990-01-01',
        email: 'newemail@example.com', // Should be ignored
      };

      const response = await supertest(web)
        .patch('/api/edit-profile')
        .set('Cookie', cookieHeader ?? '')
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.data.email).toBe(originalEmail);
      expect(response.body.data.name).toBe(updateData.name);
    });

    it('should accept special characters in name', async () => {
      const specialNames = [
        { name: 'John-Doe', gender: 'Male' },
        { name: "O'Connor", gender: 'Male' },
        { name: 'Mary Jane', gender: 'Female' },
      ];

      for (const testCase of specialNames) {
        const response = await supertest(web)
          .patch('/api/edit-profile')
          .set('Cookie', cookieHeader ?? '')
          .send({
            name: testCase.name,
            gender: testCase.gender,
            birthdate: '1990-01-01',
          });

        expect(response.status).toBe(200);
        expect(response.body.data.name).toBe(testCase.name);
        expect(response.body.data.gender).toBe(testCase.gender);
      }
    });
  });

  describe('Data Integrity', () => {
    it('should ignore extra fields in request', async () => {
      const updateData = {
        name: 'Test User',
        gender: 'Male',
        birthdate: '1990-01-01',
        extra_field: 'should be ignored',
        another_field: 123,
      };

      const response = await supertest(web)
        .patch('/api/edit-profile')
        .set('Cookie', cookieHeader ?? '')
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.data.name).toBe(updateData.name);
      expect(response.body.data.extra_field).toBeUndefined();
      expect(response.body.data.another_field).toBeUndefined();
    });
  });
});
