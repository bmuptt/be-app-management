import dotenv from 'dotenv';
import { AccessTokenTable, AuthLogic, UserTable } from '../../test-util';
import supertest from 'supertest';
import { web } from '../../../src/config/web';
import { logger } from '../../../src/config/logging';

dotenv.config();

const baseUrlTest = '/api/app-management/menu';

describe('Menu Detail Business Flow', () => {
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

  it('Should successfully retrieve menu detail', async () => {
    // Create a test menu first
    const createResponse = await supertest(web)
      .post(baseUrlTest)
      .set('Cookie', cookieHeader ?? '')
      .send({
        key_menu: 'test-menu',
        name: 'Test Menu'
      });

    expect(createResponse.status).toBe(200);
    const menuId = createResponse.body.data.id;

    // Get menu detail
    const response = await supertest(web)
      .get(`${baseUrlTest}/${menuId}/detail`)
      .set('Cookie', cookieHeader ?? '');

    logger.debug('Menu detail response', response.body);
    expect(response.status).toBe(200);
    expect(response.body.data).toBeDefined();
    expect(response.body.data.id).toBe(menuId);
    expect(response.body.data.key_menu).toBe('test-menu');
    expect(response.body.data.name).toBe('Test Menu');
    expect(response.body.data.menu_id).toBe(null);
    expect(response.body.data.active).toBe('Active');
    expect(response.body.data.created_at).toBeDefined();
    expect(response.body.data.updated_at).toBeDefined();
  });

  it('Should return 404 for non-existent menu ID', async () => {
    const response = await supertest(web)
      .get(`${baseUrlTest}/999/detail`)
      .set('Cookie', cookieHeader ?? '');

    logger.debug('Non-existent menu detail response', response.body);
    expect(response.status).toBe(404);
    expect(response.body.errors).toBeDefined();
  });

  it('Should handle negative menu ID', async () => {
    const response = await supertest(web)
      .get(`${baseUrlTest}/-1/detail`)
      .set('Cookie', cookieHeader ?? '');

    logger.debug('Negative menu ID response', response.body);
    expect(response.status).toBe(404);
    expect(response.body.errors).toBeDefined();
  });

  it('Should handle zero menu ID', async () => {
    const response = await supertest(web)
      .get(`${baseUrlTest}/0/detail`)
      .set('Cookie', cookieHeader ?? '');

    logger.debug('Zero menu ID response', response.body);
    expect(response.status).toBe(404);
    expect(response.body.errors).toBeDefined();
  });

  it('Should handle very large menu ID', async () => {
    const response = await supertest(web)
      .get(`${baseUrlTest}/999999999999/detail`)
      .set('Cookie', cookieHeader ?? '');

    logger.debug('Very large menu ID response', response.body);
    expect(response.status).toBe(500);
    expect(response.body.errors).toBeDefined();
  });

  it('Should handle decimal menu ID', async () => {
    const response = await supertest(web)
      .get(`${baseUrlTest}/999.5/detail`)
      .set('Cookie', cookieHeader ?? '');

    logger.debug('Decimal menu ID response', response.body);
    expect(response.status).toBe(404);
    expect(response.body.errors).toBeDefined();
  });

  it('Should handle invalid menu ID format', async () => {
    const response = await supertest(web)
      .get(`${baseUrlTest}/invalid/detail`)
      .set('Cookie', cookieHeader ?? '');

    logger.debug('Invalid menu ID format response', response.body);
    expect(response.status).toBe(500);
    expect(response.body.errors).toBeDefined();
  });

  it('Should handle menu with submenus', async () => {
    // Create parent menu
    const parentResponse = await supertest(web)
      .post(baseUrlTest)
      .set('Cookie', cookieHeader ?? '')
      .send({
        key_menu: 'parent-menu',
        name: 'Parent Menu'
      });

    expect(parentResponse.status).toBe(200);
    const parentId = parentResponse.body.data.id;

    // Create submenu
    const submenuResponse = await supertest(web)
      .post(baseUrlTest)
      .set('Cookie', cookieHeader ?? '')
      .send({
        key_menu: 'submenu',
        name: 'Submenu',
        menu_id: parentId
      });

    expect(submenuResponse.status).toBe(200);
    const submenuId = submenuResponse.body.data.id;

    // Get parent menu detail
    const parentDetailResponse = await supertest(web)
      .get(`${baseUrlTest}/${parentId}/detail`)
      .set('Cookie', cookieHeader ?? '');

    logger.debug('Parent menu detail response', parentDetailResponse.body);
    expect(parentDetailResponse.status).toBe(200);
    expect(parentDetailResponse.body.data.id).toBe(parentId);
    expect(parentDetailResponse.body.data.key_menu).toBe('parent-menu');
    expect(parentDetailResponse.body.data.name).toBe('Parent Menu');
    expect(parentDetailResponse.body.data.menu_id).toBe(null);

    // Get submenu detail
    const submenuDetailResponse = await supertest(web)
      .get(`${baseUrlTest}/${submenuId}/detail`)
      .set('Cookie', cookieHeader ?? '');

    logger.debug('Submenu detail response', submenuDetailResponse.body);
    expect(submenuDetailResponse.status).toBe(200);
    expect(submenuDetailResponse.body.data.id).toBe(submenuId);
    expect(submenuDetailResponse.body.data.key_menu).toBe('submenu');
    expect(submenuDetailResponse.body.data.name).toBe('Submenu');
    expect(submenuDetailResponse.body.data.menu_id).toBe(parentId);
  });

  it('Should handle inactive menu', async () => {
    // Create a test menu
    const createResponse = await supertest(web)
      .post(baseUrlTest)
      .set('Cookie', cookieHeader ?? '')
      .send({
        key_menu: 'test-menu',
        name: 'Test Menu'
      });

    expect(createResponse.status).toBe(200);
    const menuId = createResponse.body.data.id;

    // Deactivate the menu
    const deactivateResponse = await supertest(web)
      .delete(`${baseUrlTest}/${menuId}`)
      .set('Cookie', cookieHeader ?? '');

    expect(deactivateResponse.status).toBe(200);

    // Get menu detail (should still work even if inactive)
    const response = await supertest(web)
      .get(`${baseUrlTest}/${menuId}/detail`)
      .set('Cookie', cookieHeader ?? '');

    logger.debug('Inactive menu detail response', response.body);
    expect(response.status).toBe(200);
    expect(response.body.data.id).toBe(menuId);
    expect(response.body.data.active).toBe('Inactive');
  });

  it('Should return correct response structure', async () => {
    // Create a test menu
    const createResponse = await supertest(web)
      .post(baseUrlTest)
      .set('Cookie', cookieHeader ?? '')
      .send({
        key_menu: 'test-menu',
        name: 'Test Menu'
      });

    expect(createResponse.status).toBe(200);
    const menuId = createResponse.body.data.id;

    // Get menu detail
    const response = await supertest(web)
      .get(`${baseUrlTest}/${menuId}/detail`)
      .set('Cookie', cookieHeader ?? '');

    logger.debug('Response structure test', response.body);
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('data');
    expect(response.body).not.toHaveProperty('errors');
    
    const menuData = response.body.data;
    expect(menuData).toHaveProperty('id');
    expect(menuData).toHaveProperty('key_menu');
    expect(menuData).toHaveProperty('name');
    expect(menuData).toHaveProperty('menu_id');
    expect(menuData).toHaveProperty('order_number');
    expect(menuData).toHaveProperty('active');
    expect(menuData).toHaveProperty('created_at');
    expect(menuData).toHaveProperty('updated_at');
  });

  it('Should handle multiple detail requests for same menu', async () => {
    // Create a test menu
    const createResponse = await supertest(web)
      .post(baseUrlTest)
      .set('Cookie', cookieHeader ?? '')
      .send({
        key_menu: 'test-menu',
        name: 'Test Menu'
      });

    expect(createResponse.status).toBe(200);
    const menuId = createResponse.body.data.id;

    // Make multiple detail requests
    const response1 = await supertest(web)
      .get(`${baseUrlTest}/${menuId}/detail`)
      .set('Cookie', cookieHeader ?? '');

    const response2 = await supertest(web)
      .get(`${baseUrlTest}/${menuId}/detail`)
      .set('Cookie', cookieHeader ?? '');

    const response3 = await supertest(web)
      .get(`${baseUrlTest}/${menuId}/detail`)
      .set('Cookie', cookieHeader ?? '');

    logger.debug('Multiple detail requests test', {
      response1: response1.body,
      response2: response2.body,
      response3: response3.body
    });

    expect(response1.status).toBe(200);
    expect(response2.status).toBe(200);
    expect(response3.status).toBe(200);
    expect(response1.body.data.id).toBe(response2.body.data.id);
    expect(response2.body.data.id).toBe(response3.body.data.id);
  });
});
