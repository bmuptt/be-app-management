import dotenv from 'dotenv';
import { AccessTokenTable, AuthLogic, UserTable } from '../../test-util';
import supertest from 'supertest';
import { web } from '../../../src/config/web';
import { logger } from '../../../src/config/logging';

dotenv.config();

const baseUrlTest = '/api/app-management/user';

describe('List User Business Flow', () => {
  let cookies: string | string[];
  let cookieHeader: string | null;

  beforeEach(async () => {
    await UserTable.delete();
    await AccessTokenTable.delete();
    await UserTable.resetUserIdSequence();
    await AccessTokenTable.resetAccessTokenIdSequence();
    await UserTable.callUserSeed();

    const responseLogin = await AuthLogic.getLoginSuperAdmin();
    expect(responseLogin.status).toBe(200);

    cookies = responseLogin.headers['set-cookie'];
    cookieHeader = Array.isArray(cookies) ? cookies.join('; ') : cookies;
  }, 30000);

  afterEach(async () => {
    await UserTable.delete();
    await AccessTokenTable.delete();
  });

  it('Should successfully get list of users with default pagination', async () => {
    const response = await supertest(web)
      .get(baseUrlTest)
      .set('Cookie', cookieHeader ?? '');

    logger.debug('Default list response', response.body);
    expect(response.status).toBe(200);
    expect(response.body.data).toBeDefined();
    expect(Array.isArray(response.body.data)).toBe(true);
    expect(response.body.total).toBeDefined();
    expect(typeof response.body.total).toBe('number');
    expect(response.body.page).toBe(1);
  });

  it('Should successfully get list of users with custom pagination', async () => {
    const response = await supertest(web)
      .get(baseUrlTest)
      .query({
        page: 2,
        per_page: 5
      })
      .set('Cookie', cookieHeader ?? '');

    logger.debug('Custom pagination response', response.body);
    expect(response.status).toBe(200);
    expect(response.body.data).toBeDefined();
    expect(Array.isArray(response.body.data)).toBe(true);
    expect(response.body.page).toBe(2);
  });

  it('Should successfully search users by name', async () => {
    const response = await supertest(web)
      .get(baseUrlTest)
      .query({
        search: 'Admin'
      })
      .set('Cookie', cookieHeader ?? '');

    logger.debug('Search by name response', response.body);
    expect(response.status).toBe(200);
    expect(response.body.data).toBeDefined();
    expect(Array.isArray(response.body.data)).toBe(true);
    
    // Check if returned users contain 'Admin' in their name
    response.body.data.forEach((user: any) => {
      expect(user.name.toLowerCase()).toContain('admin');
    });
  });

  it('Should successfully search users by email', async () => {
    const response = await supertest(web)
      .get(baseUrlTest)
      .query({
        search: 'admin@arzhi.com'
      })
      .set('Cookie', cookieHeader ?? '');

    logger.debug('Search by email response', response.body);
    expect(response.status).toBe(200);
    expect(response.body.data).toBeDefined();
    expect(Array.isArray(response.body.data)).toBe(true);
    
    // Check if returned users contain the email
    response.body.data.forEach((user: any) => {
      expect(user.email.toLowerCase()).toContain('admin@arzhi.com');
    });
  });

  it('Should successfully sort users by name in ascending order', async () => {
    const response = await supertest(web)
      .get(baseUrlTest)
      .query({
        order_field: 'name',
        order_dir: 'asc'
      })
      .set('Cookie', cookieHeader ?? '');

    logger.debug('Sort by name asc response', response.body);
    expect(response.status).toBe(200);
    expect(response.body.data).toBeDefined();
    expect(Array.isArray(response.body.data)).toBe(true);
    
    // Check if users are sorted by name in ascending order
    const names = response.body.data.map((user: any) => user.name);
    const sortedNames = [...names].sort();
    expect(names).toEqual(sortedNames);
  });

  it('Should successfully sort users by name in descending order', async () => {
    const response = await supertest(web)
      .get(baseUrlTest)
      .query({
        order_field: 'name',
        order_dir: 'desc'
      })
      .set('Cookie', cookieHeader ?? '');

    logger.debug('Sort by name desc response', response.body);
    expect(response.status).toBe(200);
    expect(response.body.data).toBeDefined();
    expect(Array.isArray(response.body.data)).toBe(true);
    
    // Check if users are sorted by name in descending order
    const names = response.body.data.map((user: any) => user.name);
    const sortedNames = [...names].sort().reverse();
    expect(names).toEqual(sortedNames);
  });

  it('Should successfully sort users by email in ascending order', async () => {
    const response = await supertest(web)
      .get(baseUrlTest)
      .query({
        order_field: 'email',
        order_dir: 'asc'
      })
      .set('Cookie', cookieHeader ?? '');

    logger.debug('Sort by email asc response', response.body);
    expect(response.status).toBe(200);
    expect(response.body.data).toBeDefined();
    expect(Array.isArray(response.body.data)).toBe(true);
    
    // Check if users are sorted by email in ascending order
    const emails = response.body.data.map((user: any) => user.email);
    const sortedEmails = [...emails].sort();
    expect(emails).toEqual(sortedEmails);
  });

  it('Should successfully sort users by email in descending order', async () => {
    const response = await supertest(web)
      .get(baseUrlTest)
      .query({
        order_field: 'email',
        order_dir: 'desc'
      })
      .set('Cookie', cookieHeader ?? '');

    logger.debug('Sort by email desc response', response.body);
    expect(response.status).toBe(200);
    expect(response.body.data).toBeDefined();
    expect(Array.isArray(response.body.data)).toBe(true);
    
    // Check if users are sorted by email in descending order
    const emails = response.body.data.map((user: any) => user.email);
    const sortedEmails = [...emails].sort().reverse();
    expect(emails).toEqual(sortedEmails);
  });

  it('Should successfully combine search and sorting', async () => {
    const response = await supertest(web)
      .get(baseUrlTest)
      .query({
        search: 'admin',
        order_field: 'name',
        order_dir: 'asc',
        page: 1,
        per_page: 10
      })
      .set('Cookie', cookieHeader ?? '');

    logger.debug('Search and sort combined response', response.body);
    expect(response.status).toBe(200);
    expect(response.body.data).toBeDefined();
    expect(Array.isArray(response.body.data)).toBe(true);
    
    // Check if returned users contain 'admin' and are sorted
    response.body.data.forEach((user: any) => {
      expect(user.name.toLowerCase()).toContain('admin');
    });
    
    const names = response.body.data.map((user: any) => user.name);
    const sortedNames = [...names].sort();
    expect(names).toEqual(sortedNames);
  });

  it('Should handle empty search results', async () => {
    const response = await supertest(web)
      .get(baseUrlTest)
      .query({
        search: 'nonexistentuser12345'
      })
      .set('Cookie', cookieHeader ?? '');

    logger.debug('Empty search results response', response.body);
    expect(response.status).toBe(200);
    expect(response.body.data).toBeDefined();
    expect(Array.isArray(response.body.data)).toBe(true);
    expect(response.body.data.length).toBe(0);
    expect(response.body.total).toBe(0);
  });

  it('Should handle case-insensitive search', async () => {
    const response = await supertest(web)
      .get(baseUrlTest)
      .query({
        search: 'ADMIN'
      })
      .set('Cookie', cookieHeader ?? '');

    logger.debug('Case-insensitive search response', response.body);
    expect(response.status).toBe(200);
    expect(response.body.data).toBeDefined();
    expect(Array.isArray(response.body.data)).toBe(true);
    
    // Should find users with 'admin' regardless of case
    expect(response.body.data.length).toBeGreaterThan(0);
  });

  it('Should handle pagination with large page numbers', async () => {
    const response = await supertest(web)
      .get(baseUrlTest)
      .query({
        page: 999,
        per_page: 10
      })
      .set('Cookie', cookieHeader ?? '');

    logger.debug('Large page number response', response.body);
    expect(response.status).toBe(200);
    expect(response.body.data).toBeDefined();
    expect(Array.isArray(response.body.data)).toBe(true);
    expect(response.body.page).toBe(999);
    // Should return empty array for non-existent page
    expect(response.body.data.length).toBe(0);
  });

  it('Should handle different per_page values', async () => {
    const testCases = [1, 5, 10, 20, 50];

    for (const perPage of testCases) {
      const response = await supertest(web)
        .get(baseUrlTest)
        .query({
          per_page: perPage
        })
        .set('Cookie', cookieHeader ?? '');

      logger.debug(`Per page ${perPage} response`, response.body);
      expect(response.status).toBe(200);
      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeLessThanOrEqual(perPage);
    }
  });

  it('Should return correct user data structure', async () => {
    const response = await supertest(web)
      .get(baseUrlTest)
      .set('Cookie', cookieHeader ?? '');

    logger.debug('User data structure response', response.body);
    expect(response.status).toBe(200);
    expect(response.body.data).toBeDefined();
    expect(Array.isArray(response.body.data)).toBe(true);
    
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

  it('Should handle multiple users with different data', async () => {
    // First, create some additional users
    const additionalUsers = [
      {
        email: 'user1@example.com',
        name: 'User One',
        gender: 'Male',
        birthdate: '1990-01-01',
        role_id: 1
      },
      {
        email: 'user2@example.com',
        name: 'User Two',
        gender: 'Female',
        birthdate: '1995-05-15',
        role_id: 1
      },
      {
        email: 'user3@example.com',
        name: 'User Three',
        gender: 'Male',
        birthdate: '1988-12-25',
        role_id: 1
      }
    ];

    // Create the additional users
    for (const userData of additionalUsers) {
      await supertest(web)
        .post(baseUrlTest)
        .set('Cookie', cookieHeader ?? '')
        .send(userData);
    }

    // Now test listing all users
    const response = await supertest(web)
      .get(baseUrlTest)
      .set('Cookie', cookieHeader ?? '');

    logger.debug('Multiple users response', response.body);
    expect(response.status).toBe(200);
    expect(response.body.data).toBeDefined();
    expect(Array.isArray(response.body.data)).toBe(true);
    expect(response.body.total).toBeGreaterThanOrEqual(4); // Admin + 3 additional users
    
    // Check if all created users are in the list
    const userEmails = response.body.data.map((user: any) => user.email);
    additionalUsers.forEach(user => {
      expect(userEmails).toContain(user.email);
    });
  });
});
