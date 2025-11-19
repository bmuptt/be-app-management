import dotenv from 'dotenv';
import { TestHelper, AuthLogic } from '../../test-util';
import supertest from 'supertest';
import { web } from '../../../src/config/web';

dotenv.config();

const baseUrlTest = '/api/app-management/user';

describe('Reset Password User', () => {
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
    it('should reject reset password request without authentication', async () => {
      const response = await supertest(web).post(`${baseUrlTest}/reset-password/1`);

      expect(response.status).toBe(401);
    });
  });

  describe('Success Cases', () => {
    it('should successfully reset password for existing user', async () => {
      const response = await supertest(web)
        .post(`${baseUrlTest}/reset-password/1`)
        .set('Cookie', cookieHeader ?? '');

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Success to reset password user.');
      expect(response.body.data).toBeDefined();
      expect(response.body.data.active).toBe('Inactive');
      expect(response.body.data.id).toBe(1);
      expect(response.body.data.updated_by).toBe(1);
    });

    it('should set user status to Inactive after reset', async () => {
      const response = await supertest(web)
        .post(`${baseUrlTest}/reset-password/1`)
        .set('Cookie', cookieHeader ?? '');

      expect(response.status).toBe(200);
      expect(response.body.data.active).toBe('Inactive');
    });

    it('should set updated_by to user ID being reset', async () => {
      const response = await supertest(web)
        .post(`${baseUrlTest}/reset-password/1`)
        .set('Cookie', cookieHeader ?? '');

      expect(response.status).toBe(200);
      expect(response.body.data.updated_by).toBe(1);
    });

    it('should reset password for newly created user', async () => {
      // Create user
      const createResponse = await supertest(web)
        .post(baseUrlTest)
        .set('Cookie', cookieHeader ?? '')
        .send({
          email: 'newuser@example.com',
          name: 'New User',
          gender: 'Male',
          birthdate: '1990-01-01',
          role_id: 1,
        });

      const userId = createResponse.body.data.id;

      // Reset password
      const response = await supertest(web)
        .post(`${baseUrlTest}/reset-password/${userId}`)
        .set('Cookie', cookieHeader ?? '');

      expect(response.status).toBe(200);
      expect(response.body.data.active).toBe('Inactive');
      expect(response.body.data.id).toBe(userId);
      expect(response.body.data.updated_by).toBe(userId);
    });
  });

  describe('Error Cases', () => {
    it('should return 404 for non-existent user ID', async () => {
      const response = await supertest(web)
        .post(`${baseUrlTest}/reset-password/999`)
        .set('Cookie', cookieHeader ?? '');

      expect(response.status).toBe(404);
      expect(response.body.errors).toContain('The user does not exist!');
    });

    it('should return 404 for zero user ID', async () => {
      const response = await supertest(web)
        .post(`${baseUrlTest}/reset-password/0`)
        .set('Cookie', cookieHeader ?? '');

      expect(response.status).toBe(404);
      expect(response.body.errors).toContain('The user does not exist!');
    });

    it('should return 404 for negative user ID', async () => {
      const response = await supertest(web)
        .post(`${baseUrlTest}/reset-password/-1`)
        .set('Cookie', cookieHeader ?? '');

      expect(response.status).toBe(404);
      expect(response.body.errors).toContain('The user does not exist!');
    });

    it('should return 404 for very large user ID', async () => {
      const response = await supertest(web)
        .post(`${baseUrlTest}/reset-password/999999999`)
        .set('Cookie', cookieHeader ?? '');

      expect(response.status).toBe(404);
      expect(response.body.errors).toContain('The user does not exist!');
    });

    it('should return 500 for invalid user ID format', async () => {
      const response = await supertest(web)
        .post(`${baseUrlTest}/reset-password/invalid`)
        .set('Cookie', cookieHeader ?? '');

      // Invalid ID format akan menyebabkan error di Prisma
      expect(response.status).toBe(500);
    });
  });

  describe('Multiple Requests', () => {
    it('should handle multiple reset password requests for same user', async () => {
      // First reset
      const response1 = await supertest(web)
        .post(`${baseUrlTest}/reset-password/1`)
        .set('Cookie', cookieHeader ?? '');

      expect(response1.status).toBe(200);
      expect(response1.body.data.active).toBe('Inactive');

      // Second reset (should still work)
      const response2 = await supertest(web)
        .post(`${baseUrlTest}/reset-password/1`)
        .set('Cookie', cookieHeader ?? '');

      expect(response2.status).toBe(200);
      expect(response2.body.data.active).toBe('Inactive');
    });
  });

  describe('Response Structure', () => {
    it('should return correct response structure', async () => {
      const response = await supertest(web)
        .post(`${baseUrlTest}/reset-password/1`)
        .set('Cookie', cookieHeader ?? '');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('data');
      expect(response.body.message).toBe('Success to reset password user.');
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data).toHaveProperty('active');
      expect(response.body.data).toHaveProperty('updated_by');
    });
  });
});
