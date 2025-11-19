import dotenv from 'dotenv';
import { TestHelper, AuthLogic } from '../../test-util';
import supertest from 'supertest';
import { web } from '../../../src/config/web';

dotenv.config();

const baseUrlTest = '/api/app-management/user';

describe('Update User', () => {
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
    it('should reject update user request without authentication', async () => {
      const response = await supertest(web)
        .patch(`${baseUrlTest}/1`)
        .send({
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
        .patch(`${baseUrlTest}/1`)
        .set('Cookie', cookieHeader ?? '')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.errors).toEqual(
        expect.arrayContaining([
          'The email is required!',
          'The name is required!',
          'The gender is required!',
          'The birthdate is required!',
          'The role is required!',
        ]),
      );
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
          .patch(`${baseUrlTest}/1`)
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

    it('should reject duplicate email from another user', async () => {
      // Create first user
      const createResponse1 = await supertest(web)
        .post(baseUrlTest)
        .set('Cookie', cookieHeader ?? '')
        .send({
          email: 'first@example.com',
          name: 'First User',
          gender: 'Male',
          birthdate: '1990-01-01',
          role_id: 1,
        });

      // Create second user
      const createResponse2 = await supertest(web)
        .post(baseUrlTest)
        .set('Cookie', cookieHeader ?? '')
        .send({
          email: 'second@example.com',
          name: 'Second User',
          gender: 'Female',
          birthdate: '1995-05-05',
          role_id: 1,
        });

      const userId2 = createResponse2.body.data.id;

      // Try to update second user with first user's email
      const response = await supertest(web)
        .patch(`${baseUrlTest}/${userId2}`)
        .set('Cookie', cookieHeader ?? '')
        .send({
          email: 'first@example.com',
          name: 'Second User',
          gender: 'Female',
          birthdate: '1995-05-05',
          role_id: 1,
        });

      expect(response.status).toBe(400);
      expect(response.body.errors).toContain('The email cannot be the same!');
    });

    it('should not update email even if provided in request', async () => {
      // Create user
      const createResponse = await supertest(web)
        .post(baseUrlTest)
        .set('Cookie', cookieHeader ?? '')
        .send({
          email: 'test@example.com',
          name: 'Test User',
          gender: 'Male',
          birthdate: '1990-01-01',
          role_id: 1,
        });

      const userId = createResponse.body.data.id;
      const originalEmail = createResponse.body.data.email;

      // Update with same email (email tidak akan di-update)
      const response = await supertest(web)
        .patch(`${baseUrlTest}/${userId}`)
        .set('Cookie', cookieHeader ?? '')
        .send({
          email: 'test@example.com',
          name: 'Updated Name',
          gender: 'Male',
          birthdate: '1990-01-01',
          role_id: 1,
        });

      expect(response.status).toBe(200);
      expect(response.body.data.email).toBe(originalEmail); // Email tetap sama
      expect(response.body.data.name).toBe('Updated Name'); // Name ter-update
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
      ];

      for (const birthdate of invalidDates) {
        const response = await supertest(web)
          .patch(`${baseUrlTest}/1`)
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
  });

  describe('Validation - User Existence', () => {
    it('should reject when user does not exist', async () => {
      const response = await supertest(web)
        .patch(`${baseUrlTest}/999`)
        .set('Cookie', cookieHeader ?? '')
        .send({
          email: 'test@example.com',
          name: 'Test User',
          gender: 'Male',
          birthdate: '1990-01-01',
          role_id: 1,
        });

      expect(response.status).toBe(404);
      expect(response.body.errors).toContain('The user does not exist!');
    });

    it('should reject invalid user ID format', async () => {
      const response = await supertest(web)
        .patch(`${baseUrlTest}/invalid`)
        .set('Cookie', cookieHeader ?? '')
        .send({
          email: 'test@example.com',
          name: 'Test User',
          gender: 'Male',
          birthdate: '1990-01-01',
          role_id: 1,
        });

      // Invalid ID format akan menyebabkan error di Prisma
      expect(response.status).toBe(500);
    });
  });

  describe('Success Cases', () => {
    it('should successfully update user with valid data', async () => {
      // Create user first
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

      const userId = createResponse.body.data.id;
      const originalEmail = createResponse.body.data.email;

      // Update user
      const updateData = {
        email: 'updated@example.com', // Email di request tapi tidak akan di-update
        name: 'Updated User',
        gender: 'Female',
        birthdate: '1995-06-15',
        role_id: 1,
      };

      const response = await supertest(web)
        .patch(`${baseUrlTest}/${userId}`)
        .set('Cookie', cookieHeader ?? '')
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Success to edit data user.');
      expect(response.body.data.name).toBe(updateData.name);
      expect(response.body.data.gender).toBe(updateData.gender);
      expect(response.body.data.email).toBe(originalEmail); // Email tetap sama
      expect(response.body.data.birthdate).toBeDefined();
      expect(response.body.data.role_id).toBe(updateData.role_id);
    });

    it('should update updated_by field', async () => {
      // Create user
      const createResponse = await supertest(web)
        .post(baseUrlTest)
        .set('Cookie', cookieHeader ?? '')
        .send({
          email: 'test@example.com',
          name: 'Test User',
          gender: 'Male',
          birthdate: '1990-01-01',
          role_id: 1,
        });

      const userId = createResponse.body.data.id;

      // Update user
      const response = await supertest(web)
        .patch(`${baseUrlTest}/${userId}`)
        .set('Cookie', cookieHeader ?? '')
        .send({
          email: 'test@example.com',
          name: 'Updated User',
          gender: 'Male',
          birthdate: '1990-01-01',
          role_id: 1,
        });

      expect(response.status).toBe(200);
      expect(response.body.data.updated_by).toBe(1); // Admin user ID
    });

    it('should accept valid gender values', async () => {
      // Create user
      const createResponse = await supertest(web)
        .post(baseUrlTest)
        .set('Cookie', cookieHeader ?? '')
        .send({
          email: 'test@example.com',
          name: 'Test User',
          gender: 'Male',
          birthdate: '1990-01-01',
          role_id: 1,
        });

      const userId = createResponse.body.data.id;

      const validGenders = ['Male', 'Female'];

      for (const gender of validGenders) {
        const response = await supertest(web)
          .patch(`${baseUrlTest}/${userId}`)
          .set('Cookie', cookieHeader ?? '')
          .send({
            email: 'test@example.com',
            name: 'Test User',
            gender,
            birthdate: '1990-01-01',
            role_id: 1,
          });

        expect(response.status).toBe(200);
        expect(response.body.data.gender).toBe(gender);
      }
    });

    it('should accept special characters in name', async () => {
      // Create user
      const createResponse = await supertest(web)
        .post(baseUrlTest)
        .set('Cookie', cookieHeader ?? '')
        .send({
          email: 'test@example.com',
          name: 'Test User',
          gender: 'Male',
          birthdate: '1990-01-01',
          role_id: 1,
        });

      const userId = createResponse.body.data.id;

      const specialNames = [
        { name: 'John-Doe', gender: 'Male' },
        { name: "O'Connor", gender: 'Male' },
        { name: 'Mary Jane', gender: 'Female' },
      ];

      for (const testCase of specialNames) {
        const response = await supertest(web)
          .patch(`${baseUrlTest}/${userId}`)
          .set('Cookie', cookieHeader ?? '')
          .send({
            email: 'test@example.com',
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

  describe('Response Structure', () => {
    it('should return correct response structure', async () => {
      // Create user
      const createResponse = await supertest(web)
        .post(baseUrlTest)
        .set('Cookie', cookieHeader ?? '')
        .send({
          email: 'test@example.com',
          name: 'Test User',
          gender: 'Male',
          birthdate: '1990-01-01',
          role_id: 1,
        });

      const userId = createResponse.body.data.id;

      // Update user
      const response = await supertest(web)
        .patch(`${baseUrlTest}/${userId}`)
        .set('Cookie', cookieHeader ?? '')
        .send({
          email: 'test@example.com',
          name: 'Updated User',
          gender: 'Male',
          birthdate: '1990-01-01',
          role_id: 1,
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('data');
      expect(response.body.message).toBe('Success to edit data user.');
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data).toHaveProperty('email');
      expect(response.body.data).toHaveProperty('name');
      expect(response.body.data).toHaveProperty('gender');
      expect(response.body.data).toHaveProperty('birthdate');
      expect(response.body.data).toHaveProperty('active');
      expect(response.body.data).toHaveProperty('role_id');
      expect(response.body.data).toHaveProperty('created_at');
      expect(response.body.data).toHaveProperty('updated_at');
    });
  });
});
