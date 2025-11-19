import dotenv from 'dotenv';
import { TestHelper, AuthLogic } from '../../test-util';
import supertest from 'supertest';
import { web } from '../../../src/config/web';

dotenv.config();

const baseUrlTest = '/api/app-management/role';

describe('Detail Role', () => {
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
    it('should reject detail role request without authentication', async () => {
      const response = await supertest(web).get(`${baseUrlTest}/1`);

      expect(response.status).toBe(401);
    });

    it('should successfully retrieve role detail with valid authentication', async () => {
      const response = await supertest(web)
        .get(`${baseUrlTest}/1`)
        .set('Cookie', cookieHeader ?? '');

      expect(response.status).toBe(200);
      expect(response.body.data).toBeDefined();
    });
  });

  describe('Success Cases', () => {
    it('should return role detail by valid ID', async () => {
      // Create a role
      const createResponse = await supertest(web)
        .post(baseUrlTest)
        .set('Cookie', cookieHeader ?? '')
        .send({
          name: 'Test Role for Detail',
        });

      const roleId = createResponse.body.data.id;

      // Get role detail
      const response = await supertest(web)
        .get(`${baseUrlTest}/${roleId}`)
        .set('Cookie', cookieHeader ?? '');

      expect(response.status).toBe(200);
      expect(response.body.data.id).toBe(roleId);
      expect(response.body.data.name).toBe('Test Role for Detail');
    });

    it('should return complete role data structure', async () => {
      // Create a role
      const createResponse = await supertest(web)
        .post(baseUrlTest)
        .set('Cookie', cookieHeader ?? '')
        .send({
          name: 'Test Role Structure',
        });

      const roleId = createResponse.body.data.id;

      // Get role detail
      const response = await supertest(web)
        .get(`${baseUrlTest}/${roleId}`)
        .set('Cookie', cookieHeader ?? '');

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data).toHaveProperty('name');
      expect(response.body.data).toHaveProperty('created_by');
      expect(response.body.data).toHaveProperty('created_at');
      expect(response.body.data).toHaveProperty('updated_by');
      expect(response.body.data).toHaveProperty('updated_at');
    });
  });

  describe('Error Cases', () => {
    it('should return 404 for non-existent role ID', async () => {
      const response = await supertest(web)
        .get(`${baseUrlTest}/999999`)
        .set('Cookie', cookieHeader ?? '');

      expect(response.status).toBe(404);
      expect(response.body.errors).toContain('The role does not exist!');
    });

    it('should return 404 for zero role ID', async () => {
      const response = await supertest(web)
        .get(`${baseUrlTest}/0`)
        .set('Cookie', cookieHeader ?? '');

      expect(response.status).toBe(404);
      expect(response.body.errors).toContain('The role does not exist!');
    });

    it('should return 404 for negative role ID', async () => {
      const response = await supertest(web)
        .get(`${baseUrlTest}/-1`)
        .set('Cookie', cookieHeader ?? '');

      expect(response.status).toBe(404);
      expect(response.body.errors).toContain('The role does not exist!');
    });

    it('should return 500 for invalid role ID format', async () => {
      const response = await supertest(web)
        .get(`${baseUrlTest}/invalid`)
        .set('Cookie', cookieHeader ?? '');

      // Invalid ID format akan menyebabkan error di Prisma
      expect(response.status).toBe(500);
    });
  });
});
