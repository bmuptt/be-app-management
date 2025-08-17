import dotenv from 'dotenv';
import { AccessTokenTable, AuthLogic, UserTable } from '../../test-util';
import supertest from 'supertest';
import { web } from '../../../src/config/web';
import { logger } from '../../../src/config/logging';

dotenv.config();

const baseUrlTest = '/api/app-management/menu';

describe('Menu List Header Business Flow', () => {
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

  it('Should successfully get list header with default pagination', async () => {
    const response = await supertest(web)
      .get(`${baseUrlTest}/2/list-header`)
      .set('Cookie', cookieHeader ?? '');

    logger.debug('List header response', response.body);
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('data');
    expect(Array.isArray(response.body.data)).toBe(true);
    expect(response.body.data.length).toBeGreaterThan(0);
  });

  it('Should successfully get list header with custom pagination', async () => {
    const response = await supertest(web)
      .get(`${baseUrlTest}/2/list-header`)
      .query({
        page: 1,
        per_page: 10,
      })
      .set('Cookie', cookieHeader ?? '');

    logger.debug('List header with pagination response', response.body);
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('data');
    expect(Array.isArray(response.body.data)).toBe(true);
    expect(response.body.data[2].name).toBe('Role');
  });

  it('Should successfully get list header with sorting', async () => {
    const response = await supertest(web)
      .get(`${baseUrlTest}/2/list-header`)
      .query({
        order_field: 'name',
        order_dir: 'desc',
        page: 1,
        per_page: 10,
      })
      .set('Cookie', cookieHeader ?? '');

    logger.debug('List header with sorting response', response.body);
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('data');
    expect(Array.isArray(response.body.data)).toBe(true);
    expect(response.body.data[3].key_menu).toBe('appmanagement');
  });

  it('Should handle non-existent menu ID', async () => {
    const response = await supertest(web)
      .get(`${baseUrlTest}/999999/list-header`)
      .set('Cookie', cookieHeader ?? '');

    logger.debug('Non-existent menu list header response', response.body);
    expect(response.status).toBe(200);
    // The service returns empty data for non-existent menu IDs
    expect(response.body).toHaveProperty('data');
    expect(Array.isArray(response.body.data)).toBe(true);
  });

  it('Should handle negative menu ID', async () => {
    const response = await supertest(web)
      .get(`${baseUrlTest}/-1/list-header`)
      .set('Cookie', cookieHeader ?? '');

    logger.debug('Negative menu ID list header response', response.body);
    expect(response.status).toBe(200);
    // The service returns empty data for negative menu IDs
    expect(response.body).toHaveProperty('data');
    expect(Array.isArray(response.body.data)).toBe(true);
  });

  it('Should handle zero menu ID', async () => {
    const response = await supertest(web)
      .get(`${baseUrlTest}/0/list-header`)
      .set('Cookie', cookieHeader ?? '');

    logger.debug('Zero menu ID list header response', response.body);
    expect(response.status).toBe(200);
    // The service returns empty data for zero menu IDs
    expect(response.body).toHaveProperty('data');
    expect(Array.isArray(response.body.data)).toBe(true);
  });

  it('Should handle very large menu ID', async () => {
    const response = await supertest(web)
      .get(`${baseUrlTest}/999999999999/list-header`)
      .set('Cookie', cookieHeader ?? '');

    logger.debug('Very large menu ID list header response', response.body);
    expect(response.status).toBe(500);
    // Very large ID causes database integer overflow error
    expect(response.body.errors).toBeDefined();
  });

  it('Should handle invalid menu ID format', async () => {
    const response = await supertest(web)
      .get(`${baseUrlTest}/invalid/list-header`)
      .set('Cookie', cookieHeader ?? '');

    logger.debug('Invalid menu ID format list header response', response.body);
    expect(response.status).toBe(500);
    // Invalid ID format causes database error
    expect(response.body.errors).toBeDefined();
  });

  it('Should handle decimal menu ID', async () => {
    const response = await supertest(web)
      .get(`${baseUrlTest}/1.5/list-header`)
      .set('Cookie', cookieHeader ?? '');

    logger.debug('Decimal menu ID list header response', response.body);
    expect(response.status).toBe(200);
    // parseInt(1.5) returns 1, which finds the App Management menu
    expect(response.body).toHaveProperty('data');
  });

  it('Should handle different page sizes', async () => {
    const pageSizes = [5, 10, 20, 50];
    
    for (const perPage of pageSizes) {
      const response = await supertest(web)
        .get(`${baseUrlTest}/2/list-header`)
        .query({
          page: 1,
          per_page: perPage,
        })
        .set('Cookie', cookieHeader ?? '');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
    }
  });

  it('Should handle different sorting fields', async () => {
    const sortFields = ['name', 'key_menu', 'created_at'];
    
    for (const orderField of sortFields) {
      const response = await supertest(web)
        .get(`${baseUrlTest}/2/list-header`)
        .query({
          order_field: orderField,
          order_dir: 'asc',
          page: 1,
          per_page: 10,
        })
        .set('Cookie', cookieHeader ?? '');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
    }
  });

  it('Should handle different sort directions', async () => {
    const sortDirections = ['asc', 'desc'];
    
    for (const orderDir of sortDirections) {
      const response = await supertest(web)
        .get(`${baseUrlTest}/2/list-header`)
        .query({
          order_field: 'name',
          order_dir: orderDir,
          page: 1,
          per_page: 10,
        })
        .set('Cookie', cookieHeader ?? '');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
    }
  });

  it('Should return correct response structure', async () => {
    const response = await supertest(web)
      .get(`${baseUrlTest}/2/list-header`)
      .set('Cookie', cookieHeader ?? '');

    logger.debug('Response structure test', response.body);
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('data');
    expect(Array.isArray(response.body.data)).toBe(true);
    
    if (response.body.data.length > 0) {
      const firstItem = response.body.data[0];
      expect(firstItem).toHaveProperty('id');
      expect(firstItem).toHaveProperty('key_menu');
      expect(firstItem).toHaveProperty('name');
      expect(firstItem).toHaveProperty('active');
      expect(firstItem).toHaveProperty('created_by');
      expect(firstItem).toHaveProperty('created_at');
      expect(firstItem).toHaveProperty('updated_by');
      expect(firstItem).toHaveProperty('updated_at');
    }
  });

  it('Should handle multiple requests for same menu', async () => {
    const menuId = 2;
    
    // Make multiple requests to the same endpoint
    const response1 = await supertest(web)
      .get(`${baseUrlTest}/${menuId}/list-header`)
      .set('Cookie', cookieHeader ?? '');

    const response2 = await supertest(web)
      .get(`${baseUrlTest}/${menuId}/list-header`)
      .set('Cookie', cookieHeader ?? '');

    const response3 = await supertest(web)
      .get(`${baseUrlTest}/${menuId}/list-header`)
      .set('Cookie', cookieHeader ?? '');

    logger.debug('Multiple requests test', {
      response1: response1.body,
      response2: response2.body,
      response3: response3.body
    });

    expect(response1.status).toBe(200);
    expect(response2.status).toBe(200);
    expect(response3.status).toBe(200);
    expect(response1.body).toHaveProperty('data');
    expect(response2.body).toHaveProperty('data');
    expect(response3.body).toHaveProperty('data');
  });
});
