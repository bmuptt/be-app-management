import dotenv from 'dotenv';
import { TestHelper, AuthLogic } from '../../test-util';
import supertest from 'supertest';
import { web } from '../../../src/config/web';

dotenv.config();

const baseUrlTest = '/api/app-management/role';

describe('Store Role', () => {
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
    it('should reject store role request without authentication', async () => {
      const response = await supertest(web).post(baseUrlTest).send({
        name: 'Test Role',
      });

      expect(response.status).toBe(401);
    });
  });

  describe('Validation - Required Fields', () => {
    it('should reject when name is missing', async () => {
      const response = await supertest(web)
        .post(baseUrlTest)
        .set('Cookie', cookieHeader ?? '')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.errors).toContain('The name is required!');
    });

    it('should reject when name is empty', async () => {
      const response = await supertest(web)
        .post(baseUrlTest)
        .set('Cookie', cookieHeader ?? '')
        .send({
          name: '',
        });

      expect(response.status).toBe(400);
      expect(response.body.errors).toContain('The name is required!');
    });
  });

  describe('Validation - Duplicate Name', () => {
    it('should reject duplicate role name', async () => {
      // Create first role
      await supertest(web)
        .post(baseUrlTest)
        .set('Cookie', cookieHeader ?? '')
        .send({
          name: 'Test Role',
        });

      // Try to create another role with the same name
      const response = await supertest(web)
        .post(baseUrlTest)
        .set('Cookie', cookieHeader ?? '')
        .send({
          name: 'Test Role',
        });

      expect(response.status).toBe(400);
      expect(response.body.errors).toContain('The name cannot be the same!');
    });
  });

  describe('Success Cases', () => {
    it('should successfully create role with valid name', async () => {
      const response = await supertest(web)
        .post(baseUrlTest)
        .set('Cookie', cookieHeader ?? '')
        .send({
          name: 'Test Role',
        });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Success to add data role.');
      expect(response.body.data).toBeDefined();
      expect(response.body.data.name).toBe('Test Role');
      expect(response.body.data.created_by).toBe(1); // Admin user ID
      expect(response.body.data.id).toBeDefined();
    });

    it('should accept special characters in name', async () => {
      const specialName = 'Role with @#$%^&*()_+-=[]{}|;:,.<>?';

      const response = await supertest(web)
        .post(baseUrlTest)
        .set('Cookie', cookieHeader ?? '')
        .send({
          name: specialName,
        });

      expect(response.status).toBe(200);
      expect(response.body.data.name).toBe(specialName);
    });

    it('should accept unicode characters in name', async () => {
      const unicodeName = 'Rôle avec caractères spéciaux 角色 役割';

      const response = await supertest(web)
        .post(baseUrlTest)
        .set('Cookie', cookieHeader ?? '')
        .send({
          name: unicodeName,
        });

      expect(response.status).toBe(200);
      expect(response.body.data.name).toBe(unicodeName);
    });
  });

  describe('Response Structure', () => {
    it('should return correct response structure', async () => {
      const response = await supertest(web)
        .post(baseUrlTest)
        .set('Cookie', cookieHeader ?? '')
        .send({
          name: 'Test Role Structure',
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('data');
      expect(response.body.message).toBe('Success to add data role.');
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data).toHaveProperty('name');
      expect(response.body.data).toHaveProperty('created_by');
      expect(response.body.data).toHaveProperty('created_at');
      expect(response.body.data).toHaveProperty('updated_by');
      expect(response.body.data).toHaveProperty('updated_at');
    });
  });
});
