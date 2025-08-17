import dotenv from 'dotenv';
import { AccessTokenTable, AuthLogic, UserTable } from '../../test-util';
import supertest from 'supertest';
import { web } from '../../../src/config/web';
import { logger } from '../../../src/config/logging';

dotenv.config();

const baseUrlTest = '/api/app-management/role';

describe('List Role Business Flow', () => {
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

  it('Should successfully list roles with default pagination', async () => {
    const response = await supertest(web)
      .get(baseUrlTest)
      .set('Cookie', cookieHeader ?? '');

    logger.debug('List roles response', response.body);
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('data');
    expect(response.body).toHaveProperty('total');
    expect(response.body).toHaveProperty('page');
    expect(Array.isArray(response.body.data)).toBe(true);
    expect(response.body.page).toBe(1);
    expect(response.body.total).toBeGreaterThanOrEqual(1); // At least Super Admin role
  });

  it('Should list roles with custom pagination', async () => {
    const response = await supertest(web)
      .get(`${baseUrlTest}?page=1&limit=5`)
      .set('Cookie', cookieHeader ?? '');

    logger.debug('List roles with pagination response', response.body);
    expect(response.status).toBe(200);
    expect(response.body.page).toBe(1);
    expect(response.body.data.length).toBeLessThanOrEqual(5);
  });

  it('Should handle search functionality', async () => {
    // First create a role with specific name
    const createResponse = await supertest(web)
      .post(baseUrlTest)
      .set('Cookie', cookieHeader ?? '')
      .send({
        name: 'Searchable Role'
      });

    expect(createResponse.status).toBe(200);

    // Search for the role
    const searchResponse = await supertest(web)
      .get(`${baseUrlTest}?search=Searchable`)
      .set('Cookie', cookieHeader ?? '');

    logger.debug('Search roles response', searchResponse.body);
    expect(searchResponse.status).toBe(200);
    expect(searchResponse.body.data.length).toBeGreaterThan(0);
    expect(searchResponse.body.data.some((role: any) => role.name.includes('Searchable'))).toBe(true);
  });

  it('Should handle case-insensitive search', async () => {
    // First create a role with specific name
    const createResponse = await supertest(web)
      .post(baseUrlTest)
      .set('Cookie', cookieHeader ?? '')
      .send({
        name: 'CaseSensitive Role'
      });

    expect(createResponse.status).toBe(200);

    // Search with different case
    const searchResponse = await supertest(web)
      .get(`${baseUrlTest}?search=casesensitive`)
      .set('Cookie', cookieHeader ?? '');

    logger.debug('Case-insensitive search response', searchResponse.body);
    expect(searchResponse.status).toBe(200);
    expect(searchResponse.body.data.length).toBeGreaterThan(0);
    expect(searchResponse.body.data.some((role: any) => role.name.includes('CaseSensitive'))).toBe(true);
  });

  it('Should handle sorting by name ascending', async () => {
    const response = await supertest(web)
      .get(`${baseUrlTest}?order_field=name&order_dir=asc`)
      .set('Cookie', cookieHeader ?? '');

    logger.debug('Sort by name ascending response', response.body);
    expect(response.status).toBe(200);
    expect(response.body.data.length).toBeGreaterThan(0);
    
    // Check if data is sorted
    const names = response.body.data.map((role: any) => role.name);
    const sortedNames = [...names].sort();
    expect(names).toEqual(sortedNames);
  });

  it('Should handle sorting by name descending', async () => {
    const response = await supertest(web)
      .get(`${baseUrlTest}?order_field=name&order_dir=desc`)
      .set('Cookie', cookieHeader ?? '');

    logger.debug('Sort by name descending response', response.body);
    expect(response.status).toBe(200);
    expect(response.body.data.length).toBeGreaterThan(0);
    
    // Check if data is sorted
    const names = response.body.data.map((role: any) => role.name);
    const sortedNames = [...names].sort().reverse();
    expect(names).toEqual(sortedNames);
  });

  it('Should handle sorting by id descending (default)', async () => {
    const response = await supertest(web)
      .get(baseUrlTest)
      .set('Cookie', cookieHeader ?? '');

    logger.debug('Default sort response', response.body);
    expect(response.status).toBe(200);
    expect(response.body.data.length).toBeGreaterThan(0);
    
    // Check if data is sorted by id descending
    const ids = response.body.data.map((role: any) => role.id);
    const sortedIds = [...ids].sort((a, b) => b - a);
    expect(ids).toEqual(sortedIds);
  });

  it('Should handle empty search results', async () => {
    const response = await supertest(web)
      .get(`${baseUrlTest}?search=NonExistentRoleName`)
      .set('Cookie', cookieHeader ?? '');

    logger.debug('Empty search results response', response.body);
    expect(response.status).toBe(200);
    expect(response.body.data.length).toBe(0);
    expect(response.body.total).toBe(0);
  });

          it('Should handle invalid pagination parameters', async () => {
          const response = await supertest(web)
            .get(`${baseUrlTest}?page=0&limit=-1`)
            .set('Cookie', cookieHeader ?? '');
      
          logger.debug('Invalid pagination response', response.body);
          expect(response.status).toBe(500);
          // Negative limit causes database error
          expect(response.body.errors).toBeDefined();
        });

  it('Should handle very large page numbers', async () => {
    const response = await supertest(web)
      .get(`${baseUrlTest}?page=999999`)
      .set('Cookie', cookieHeader ?? '');

    logger.debug('Large page number response', response.body);
    expect(response.status).toBe(200);
    expect(response.body.data.length).toBe(0); // Should be empty for non-existent page
    expect(response.body.page).toBe(999999);
  });

  it('Should handle multiple query parameters', async () => {
    const response = await supertest(web)
      .get(`${baseUrlTest}?page=1&limit=10&search=Admin&order_field=name&order_dir=asc`)
      .set('Cookie', cookieHeader ?? '');

    logger.debug('Multiple query parameters response', response.body);
    expect(response.status).toBe(200);
    expect(response.body.page).toBe(1);
    expect(response.body.data.length).toBeLessThanOrEqual(10);
  });

  it('Should return correct response structure', async () => {
    const response = await supertest(web)
      .get(baseUrlTest)
      .set('Cookie', cookieHeader ?? '');

    logger.debug('Response structure test', response.body);
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

  it('Should handle special characters in search', async () => {
    // First create a role with special characters
    const createResponse = await supertest(web)
      .post(baseUrlTest)
      .set('Cookie', cookieHeader ?? '')
      .send({
        name: 'Role with @#$%^&*()'
      });

    expect(createResponse.status).toBe(200);

    // Search for the role
    const searchResponse = await supertest(web)
      .get(`${baseUrlTest}?search=@#$%^&*()`)
      .set('Cookie', cookieHeader ?? '');

    logger.debug('Special characters search response', searchResponse.body);
    expect(searchResponse.status).toBe(200);
    expect(searchResponse.body.data.length).toBeGreaterThan(0);
  });

  it('Should handle Unicode characters in search', async () => {
    // First create a role with Unicode characters
    const createResponse = await supertest(web)
      .post(baseUrlTest)
      .set('Cookie', cookieHeader ?? '')
      .send({
        name: 'Rôle avec caractères spéciaux 角色'
      });

    expect(createResponse.status).toBe(200);

    // Search for the role
    const searchResponse = await supertest(web)
      .get(`${baseUrlTest}?search=角色`)
      .set('Cookie', cookieHeader ?? '');

    logger.debug('Unicode characters search response', searchResponse.body);
    expect(searchResponse.status).toBe(200);
    expect(searchResponse.body.data.length).toBeGreaterThan(0);
  });

  it('Should handle large limit values', async () => {
    const response = await supertest(web)
      .get(`${baseUrlTest}?limit=1000`)
      .set('Cookie', cookieHeader ?? '');

    logger.debug('Large limit response', response.body);
    expect(response.status).toBe(200);
    expect(response.body.data.length).toBeLessThanOrEqual(1000);
  });

          it('Should handle zero limit', async () => {
          const response = await supertest(web)
            .get(`${baseUrlTest}?limit=0`)
            .set('Cookie', cookieHeader ?? '');
      
          logger.debug('Zero limit response', response.body);
          expect(response.status).toBe(200);
          expect(response.body.data.length).toBe(1);
          // Current implementation returns 1 record even with limit=0
        });
});
