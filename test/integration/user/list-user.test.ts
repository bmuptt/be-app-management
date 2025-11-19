import dotenv from 'dotenv';
import { TestHelper, AuthLogic } from '../../test-util';
import supertest from 'supertest';
import { web } from '../../../src/config/web';

dotenv.config();

const baseUrlTest = '/api/app-management/user';

describe('List User', () => {
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
    it('should reject list user request without authentication', async () => {
      const response = await supertest(web).get(baseUrlTest);

      expect(response.status).toBe(401);
    });

    it('should successfully retrieve user list with valid authentication', async () => {
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
    });

    it('should return custom pagination', async () => {
      const response = await supertest(web)
        .get(baseUrlTest)
        .query({
          page: 2,
          per_page: 5,
        })
        .set('Cookie', cookieHeader ?? '');

      expect(response.status).toBe(200);
      expect(response.body.page).toBe(2);
      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should return empty array for non-existent page', async () => {
      const response = await supertest(web)
        .get(baseUrlTest)
        .query({
          page: 999,
          per_page: 10,
        })
        .set('Cookie', cookieHeader ?? '');

      expect(response.status).toBe(200);
      expect(response.body.page).toBe(999);
      expect(response.body.data).toEqual([]);
    });

    it('should respect per_page limit', async () => {
      const perPageValues = [1, 5, 10, 20];

      for (const perPage of perPageValues) {
        const response = await supertest(web)
          .get(baseUrlTest)
          .query({ per_page: perPage })
          .set('Cookie', cookieHeader ?? '');

        expect(response.status).toBe(200);
        expect(response.body.data.length).toBeLessThanOrEqual(perPage);
      }
    });
  });

  describe('Search', () => {
    it('should search users by name', async () => {
      const response = await supertest(web)
        .get(baseUrlTest)
        .query({ search: 'Admin' })
        .set('Cookie', cookieHeader ?? '');

      expect(response.status).toBe(200);
      expect(response.body.data.length).toBeGreaterThan(0);
      response.body.data.forEach((user: any) => {
        expect(user.name.toLowerCase()).toContain('admin');
      });
    });

    it('should search users by email', async () => {
      const response = await supertest(web)
        .get(baseUrlTest)
        .query({ search: 'admin@arzhi.com' })
        .set('Cookie', cookieHeader ?? '');

      expect(response.status).toBe(200);
      expect(response.body.data.length).toBeGreaterThan(0);
      response.body.data.forEach((user: any) => {
        expect(user.email.toLowerCase()).toContain('admin@arzhi.com');
      });
    });

    it('should return empty array for non-existent search', async () => {
      const response = await supertest(web)
        .get(baseUrlTest)
        .query({ search: 'nonexistentuser12345' })
        .set('Cookie', cookieHeader ?? '');

      expect(response.status).toBe(200);
      expect(response.body.data).toEqual([]);
      expect(response.body.total).toBe(0);
    });

    it('should be case-insensitive', async () => {
      const response = await supertest(web)
        .get(baseUrlTest)
        .query({ search: 'ADMIN' })
        .set('Cookie', cookieHeader ?? '');

      expect(response.status).toBe(200);
      expect(response.body.data.length).toBeGreaterThan(0);
    });
  });

  describe('Sorting', () => {
    it('should sort by name ascending', async () => {
      const response = await supertest(web)
        .get(baseUrlTest)
        .query({
          order_field: 'name',
          order_dir: 'asc',
        })
        .set('Cookie', cookieHeader ?? '');

      expect(response.status).toBe(200);
      const names = response.body.data.map((user: any) => user.name);
      const sortedNames = [...names].sort();
      expect(names).toEqual(sortedNames);
    });

    it('should sort by name descending', async () => {
      const response = await supertest(web)
        .get(baseUrlTest)
        .query({
          order_field: 'name',
          order_dir: 'desc',
        })
        .set('Cookie', cookieHeader ?? '');

      expect(response.status).toBe(200);
      const names = response.body.data.map((user: any) => user.name);
      const sortedNames = [...names].sort().reverse();
      expect(names).toEqual(sortedNames);
    });

    it('should sort by email ascending', async () => {
      const response = await supertest(web)
        .get(baseUrlTest)
        .query({
          order_field: 'email',
          order_dir: 'asc',
        })
        .set('Cookie', cookieHeader ?? '');

      expect(response.status).toBe(200);
      const emails = response.body.data.map((user: any) => user.email);
      const sortedEmails = [...emails].sort();
      expect(emails).toEqual(sortedEmails);
    });

    it('should sort by email descending', async () => {
      const response = await supertest(web)
        .get(baseUrlTest)
        .query({
          order_field: 'email',
          order_dir: 'desc',
        })
        .set('Cookie', cookieHeader ?? '');

      expect(response.status).toBe(200);
      const emails = response.body.data.map((user: any) => user.email);
      const sortedEmails = [...emails].sort().reverse();
      expect(emails).toEqual(sortedEmails);
    });
  });

  describe('Combined Features', () => {
    it('should combine search and sorting', async () => {
      const response = await supertest(web)
        .get(baseUrlTest)
        .query({
          search: 'admin',
          order_field: 'name',
          order_dir: 'asc',
          page: 1,
          per_page: 10,
        })
        .set('Cookie', cookieHeader ?? '');

      expect(response.status).toBe(200);
      expect(response.body.data.length).toBeGreaterThan(0);
      response.body.data.forEach((user: any) => {
        expect(user.name.toLowerCase()).toContain('admin');
      });

      const names = response.body.data.map((user: any) => user.name);
      const sortedNames = [...names].sort();
      expect(names).toEqual(sortedNames);
    });
  });

  describe('Data Structure', () => {
    it('should return correct user data structure', async () => {
      const response = await supertest(web)
        .get(baseUrlTest)
        .set('Cookie', cookieHeader ?? '');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('total');
      expect(response.body).toHaveProperty('page');

      if (response.body.data.length > 0) {
        const user = response.body.data[0];
        expect(user).toHaveProperty('id');
        expect(user).toHaveProperty('email');
        expect(user).toHaveProperty('name');
        expect(user).toHaveProperty('gender');
        expect(user).toHaveProperty('birthdate');
        expect(user).toHaveProperty('active');
        expect(user).toHaveProperty('role_id');
        expect(user).toHaveProperty('created_at');
        expect(user).toHaveProperty('updated_at');
        expect(user).toHaveProperty('created_by');
        expect(user).toHaveProperty('updated_by');
        expect(user).toHaveProperty('photo');
      }
    });
  });
});
