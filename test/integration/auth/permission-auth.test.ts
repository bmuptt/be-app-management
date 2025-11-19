import dotenv from 'dotenv';
import { TestHelper, AuthLogic } from '../../test-util';
import supertest from 'supertest';
import { web } from '../../../src/config/web';

dotenv.config();

const baseUrlTest = '/api/permission';

describe('Permission', () => {
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
    it('should reject permission request without authentication', async () => {
      const response = await supertest(web).get(baseUrlTest);

      expect(response.status).toBe(401);
    });

    it('should accept permission request with valid authentication', async () => {
      const response = await supertest(web)
        .get(`${baseUrlTest}?key_menu=user`)
        .set('Cookie', cookieHeader ?? '');

      expect(response.status).toBe(200);
    });
  });

  describe('Validation', () => {
    it('should reject when key_menu parameter is missing', async () => {
      const response = await supertest(web)
        .get(baseUrlTest)
        .set('Cookie', cookieHeader ?? '');

      expect(response.status).toBe(400);
      expect(response.body.errors).toContain('The key menu is required!');
    });

    it('should reject when key_menu parameter is empty', async () => {
      const response = await supertest(web)
        .get(`${baseUrlTest}?key_menu=`)
        .set('Cookie', cookieHeader ?? '');

      expect(response.status).toBe(400);
      expect(response.body.errors).toContain('The key menu is required!');
    });
  });

  describe('Permission Checks', () => {
    it('should return false permissions for nonexistent menu', async () => {
      const response = await supertest(web)
        .get(`${baseUrlTest}?key_menu=nonexistent_menu`)
        .set('Cookie', cookieHeader ?? '');

      expect(response.status).toBe(200);
      expect(response.body.data).toEqual({
        access: false,
        create: false,
        update: false,
        delete: false,
        approve1: false,
        approve2: false,
        approve3: false,
      });
    });

    it('should return correct permissions for existing menu', async () => {
      const response = await supertest(web)
        .get(`${baseUrlTest}?key_menu=user`)
        .set('Cookie', cookieHeader ?? '');

      expect(response.status).toBe(200);
      expect(response.body.data.access).toBe(true);
      expect(response.body.data.create).toBe(true);
      expect(response.body.message).toBe('Success to get permission.');
    });

    it('should return correct permissions for different menu keys', async () => {
      const testCases = [
        { key_menu: 'user', expectedAccess: true },
        { key_menu: 'role', expectedAccess: true },
        { key_menu: 'menu', expectedAccess: true },
        { key_menu: 'nonexistent', expectedAccess: false },
      ];

      for (const testCase of testCases) {
        const response = await supertest(web)
          .get(`${baseUrlTest}?key_menu=${testCase.key_menu}`)
          .set('Cookie', cookieHeader ?? '');

        expect(response.status).toBe(200);
        expect(response.body.data.access).toBe(testCase.expectedAccess);
      }
    });
  });

  describe('Response Structure', () => {
    it('should return correct response structure', async () => {
      const response = await supertest(web)
        .get(`${baseUrlTest}?key_menu=user`)
        .set('Cookie', cookieHeader ?? '');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('access');
      expect(response.body.data).toHaveProperty('create');
      expect(response.body.data).toHaveProperty('update');
      expect(response.body.data).toHaveProperty('delete');
      expect(response.body.data).toHaveProperty('approve1');
      expect(response.body.data).toHaveProperty('approve2');
      expect(response.body.data).toHaveProperty('approve3');
    });

    it('should return success message', async () => {
      const response = await supertest(web)
        .get(`${baseUrlTest}?key_menu=user`)
        .set('Cookie', cookieHeader ?? '');

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Success to get permission.');
    });
  });
});
