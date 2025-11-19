import dotenv from 'dotenv';
import { TestHelper, AuthLogic } from '../../test-util';
import supertest from 'supertest';
import { web } from '../../../src/config/web';

dotenv.config();

const baseUrlTest = '/api/app-management/role';

describe('List Role', () => {
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
    it('should reject list role request without authentication', async () => {
      const response = await supertest(web).get(baseUrlTest);

      expect(response.status).toBe(401);
    });

    it('should successfully retrieve role list with valid authentication', async () => {
      const response = await supertest(web)
        .get(baseUrlTest)
        .set('Cookie', cookieHeader ?? '');

      expect(response.status).toBe(200);
      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe('Pagination', () => {
    it('should return default pagination (page 1)', async () => {
      const response = await supertest(web)
        .get(baseUrlTest)
        .set('Cookie', cookieHeader ?? '');

      expect(response.status).toBe(200);
      expect(response.body.page).toBe(1);
      expect(response.body.total).toBeDefined();
      expect(typeof response.body.total).toBe('number');
      expect(response.body.total).toBeGreaterThanOrEqual(1); // At least Super Admin role
    });

    it('should return custom pagination', async () => {
      const response = await supertest(web)
        .get(`${baseUrlTest}?page=1&limit=5`)
        .set('Cookie', cookieHeader ?? '');

      expect(response.status).toBe(200);
      expect(response.body.page).toBe(1);
      expect(response.body.data.length).toBeLessThanOrEqual(5);
    });

    it('should return empty array for non-existent page', async () => {
      const response = await supertest(web)
        .get(`${baseUrlTest}?page=999999`)
        .set('Cookie', cookieHeader ?? '');

      expect(response.status).toBe(200);
      expect(response.body.page).toBe(999999);
      expect(response.body.data).toEqual([]);
    });
  });

  describe('Search', () => {
    it('should search roles by name', async () => {
      // Create a role with specific name
      await supertest(web)
        .post(baseUrlTest)
        .set('Cookie', cookieHeader ?? '')
        .send({
          name: 'Searchable Role',
        });

      // Search for the role
      const response = await supertest(web)
        .get(`${baseUrlTest}?search=Searchable`)
        .set('Cookie', cookieHeader ?? '');

      expect(response.status).toBe(200);
      expect(response.body.data.length).toBeGreaterThan(0);
      expect(
        response.body.data.some((role: any) =>
          role.name.includes('Searchable'),
        ),
      ).toBe(true);
    });

    it('should be case-insensitive', async () => {
      // Create a role with specific name
      await supertest(web)
        .post(baseUrlTest)
        .set('Cookie', cookieHeader ?? '')
        .send({
          name: 'CaseSensitive Role',
        });

      // Search with different case
      const response = await supertest(web)
        .get(`${baseUrlTest}?search=casesensitive`)
        .set('Cookie', cookieHeader ?? '');

      expect(response.status).toBe(200);
      expect(response.body.data.length).toBeGreaterThan(0);
      expect(
        response.body.data.some((role: any) =>
          role.name.includes('CaseSensitive'),
        ),
      ).toBe(true);
    });

    it('should return empty array for non-existent search', async () => {
      const response = await supertest(web)
        .get(`${baseUrlTest}?search=NonExistentRoleName`)
        .set('Cookie', cookieHeader ?? '');

      expect(response.status).toBe(200);
      expect(response.body.data).toEqual([]);
      expect(response.body.total).toBe(0);
    });
  });

  describe('Sorting', () => {
    it('should sort by name ascending', async () => {
      const response = await supertest(web)
        .get(`${baseUrlTest}?order_field=name&order_dir=asc`)
        .set('Cookie', cookieHeader ?? '');

      expect(response.status).toBe(200);
      expect(response.body.data.length).toBeGreaterThan(0);

      const names = response.body.data.map((role: any) => role.name);
      const sortedNames = [...names].sort();
      expect(names).toEqual(sortedNames);
    });

    it('should sort by name descending', async () => {
      const response = await supertest(web)
        .get(`${baseUrlTest}?order_field=name&order_dir=desc`)
        .set('Cookie', cookieHeader ?? '');

      expect(response.status).toBe(200);
      expect(response.body.data.length).toBeGreaterThan(0);

      const names = response.body.data.map((role: any) => role.name);
      const sortedNames = [...names].sort().reverse();
      expect(names).toEqual(sortedNames);
    });

    it('should default sort by id descending', async () => {
      const response = await supertest(web)
        .get(baseUrlTest)
        .set('Cookie', cookieHeader ?? '');

      expect(response.status).toBe(200);
      expect(response.body.data.length).toBeGreaterThan(0);

      const ids = response.body.data.map((role: any) => role.id);
      const sortedIds = [...ids].sort((a, b) => b - a);
      expect(ids).toEqual(sortedIds);
    });
  });

  describe('Combined Features', () => {
    it('should combine search, pagination, and sorting', async () => {
      const response = await supertest(web)
        .get(
          `${baseUrlTest}?page=1&limit=10&search=Admin&order_field=name&order_dir=asc`,
        )
        .set('Cookie', cookieHeader ?? '');

      expect(response.status).toBe(200);
      expect(response.body.page).toBe(1);
      expect(response.body.data.length).toBeLessThanOrEqual(10);
    });
  });

  describe('Data Structure', () => {
    it('should return correct role data structure', async () => {
      const response = await supertest(web)
        .get(baseUrlTest)
        .set('Cookie', cookieHeader ?? '');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('total');
      expect(response.body).toHaveProperty('page');
      expect(Array.isArray(response.body.data)).toBe(true);

      if (response.body.data.length > 0) {
        const role = response.body.data[0];
        expect(role).toHaveProperty('id');
        expect(role).toHaveProperty('name');
        expect(role).toHaveProperty('created_by');
        expect(role).toHaveProperty('created_at');
        expect(role).toHaveProperty('updated_by');
        expect(role).toHaveProperty('updated_at');
      }
    });
  });
});
