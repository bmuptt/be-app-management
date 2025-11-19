import dotenv from 'dotenv';
import { TestHelper, AuthLogic } from '../../test-util';
import supertest from 'supertest';
import { web } from '../../../src/config/web';

dotenv.config();

const baseUrlTest = '/api/app-management/user';

describe('Detail User', () => {
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
    it('should reject detail user request without authentication', async () => {
      const response = await supertest(web).get(`${baseUrlTest}/1`);

      expect(response.status).toBe(401);
    });

    it('should successfully retrieve user detail with valid authentication', async () => {
      const response = await supertest(web)
        .get(`${baseUrlTest}/1`)
        .set('Cookie', cookieHeader ?? '');

      expect(response.status).toBe(200);
      expect(response.body.data).toBeDefined();
    });
  });

  describe('Success Cases', () => {
    it('should return user detail by valid ID', async () => {
      const response = await supertest(web)
        .get(`${baseUrlTest}/1`)
        .set('Cookie', cookieHeader ?? '');

      expect(response.status).toBe(200);
      expect(response.body.data.id).toBe(1);
      expect(response.body.data.email).toBe(process.env.EMAIL_ADMIN);
      expect(response.body.data.name).toBe('Admin');
    });

    it('should return complete user data structure', async () => {
      const response = await supertest(web)
        .get(`${baseUrlTest}/1`)
        .set('Cookie', cookieHeader ?? '');

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data).toHaveProperty('email');
      expect(response.body.data).toHaveProperty('name');
      expect(response.body.data).toHaveProperty('gender');
      expect(response.body.data).toHaveProperty('birthdate');
      expect(response.body.data).toHaveProperty('active');
      expect(response.body.data).toHaveProperty('role_id');
      expect(response.body.data).toHaveProperty('created_at');
      expect(response.body.data).toHaveProperty('updated_at');
      expect(response.body.data).toHaveProperty('created_by');
      expect(response.body.data).toHaveProperty('updated_by');
      expect(response.body.data).toHaveProperty('photo');
    });

    it('should include role information in response', async () => {
      const response = await supertest(web)
        .get(`${baseUrlTest}/1`)
        .set('Cookie', cookieHeader ?? '');

      expect(response.status).toBe(200);
      expect(response.body.data.role).toBeDefined();
      expect(response.body.data.role).toHaveProperty('id');
      expect(response.body.data.role).toHaveProperty('name');
    });
  });

  describe('Error Cases', () => {
    it('should return 404 for non-existent user ID', async () => {
      const response = await supertest(web)
        .get(`${baseUrlTest}/999`)
        .set('Cookie', cookieHeader ?? '');

      expect(response.status).toBe(404);
      expect(response.body.errors).toContain('The user does not exist!');
    });

    it('should return 404 for zero user ID', async () => {
      const response = await supertest(web)
        .get(`${baseUrlTest}/0`)
        .set('Cookie', cookieHeader ?? '');

      expect(response.status).toBe(404);
      expect(response.body.errors).toContain('The user does not exist!');
    });

    it('should return 404 for negative user ID', async () => {
      const response = await supertest(web)
        .get(`${baseUrlTest}/-1`)
        .set('Cookie', cookieHeader ?? '');

      expect(response.status).toBe(404);
      expect(response.body.errors).toContain('The user does not exist!');
    });

    it('should return 404 for very large user ID', async () => {
      const response = await supertest(web)
        .get(`${baseUrlTest}/999999999`)
        .set('Cookie', cookieHeader ?? '');

      expect(response.status).toBe(404);
      expect(response.body.errors).toContain('The user does not exist!');
    });

    it('should return 500 for invalid user ID format', async () => {
      const response = await supertest(web)
        .get(`${baseUrlTest}/invalid`)
        .set('Cookie', cookieHeader ?? '');

      // Invalid ID format akan menyebabkan error di Prisma
      expect(response.status).toBe(500);
    });
  });
});
