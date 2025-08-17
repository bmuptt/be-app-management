import dotenv from 'dotenv';
import { AccessTokenTable, AuthLogic, UserTable } from '../../test-util';
import supertest from 'supertest';
import { web } from '../../../src/config/web';
import { logger } from '../../../src/config/logging';

dotenv.config();

const baseUrlTest = '/api/app-management/menu';

describe('Menu Delete Business Flow', () => {
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

  it('Should successfully delete menu by setting it to inactive', async () => {
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

    // Delete the menu (set to inactive)
    const response = await supertest(web)
      .delete(`${baseUrlTest}/${menuId}`)
      .set('Cookie', cookieHeader ?? '');

    logger.debug('Delete menu response', response.body);
    expect(response.status).toBe(200);
    expect(response.body.data.active).toBe('Inactive');
    expect(response.body.data.id).toBe(menuId);
  });

  it('Should return 404 for non-existent menu ID', async () => {
    const response = await supertest(web)
      .delete(`${baseUrlTest}/999999`)
      .set('Cookie', cookieHeader ?? '');

    logger.debug('Non-existent menu delete response', response.body);
    expect(response.status).toBe(404);
    expect(response.body.errors).toContain("The menu does not exist!");
  });

  it('Should handle negative menu ID', async () => {
    const response = await supertest(web)
      .delete(`${baseUrlTest}/-1`)
      .set('Cookie', cookieHeader ?? '');

    logger.debug('Negative menu ID delete response', response.body);
    expect(response.status).toBe(404);
    expect(response.body.errors).toContain("The menu does not exist!");
  });

  it('Should handle zero menu ID', async () => {
    const response = await supertest(web)
      .delete(`${baseUrlTest}/0`)
      .set('Cookie', cookieHeader ?? '');

    logger.debug('Zero menu ID delete response', response.body);
    expect(response.status).toBe(404);
    expect(response.body.errors).toContain("The menu does not exist!");
  });

  it('Should handle very large menu ID', async () => {
    const response = await supertest(web)
      .delete(`${baseUrlTest}/999999999999`)
      .set('Cookie', cookieHeader ?? '');

    logger.debug('Very large menu ID delete response', response.body);
    expect(response.status).toBe(500);
    // Very large ID causes database integer overflow error
    expect(response.body.errors).toBeDefined();
  });

  it('Should handle decimal menu ID', async () => {
    const response = await supertest(web)
      .delete(`${baseUrlTest}/1.5`)
      .set('Cookie', cookieHeader ?? '');

    logger.debug('Decimal menu ID delete response', response.body);
    expect(response.status).toBe(200);
    // parseInt(1.5) returns 1, which finds the App Management menu
    expect(response.body.data.active).toBe('Inactive');
  });

  it('Should handle invalid menu ID format', async () => {
    const response = await supertest(web)
      .delete(`${baseUrlTest}/invalid`)
      .set('Cookie', cookieHeader ?? '');

    logger.debug('Invalid menu ID format delete response', response.body);
    expect(response.status).toBe(500);
    // Invalid ID format causes database error
    expect(response.body.errors).toBeDefined();
  });

  it('Should delete menu with submenus', async () => {
    // Create a parent menu
    const parentResponse = await supertest(web)
      .post(baseUrlTest)
      .set('Cookie', cookieHeader ?? '')
      .send({
        key_menu: 'parent-menu',
        name: 'Parent Menu'
      });

    expect(parentResponse.status).toBe(200);
    const parentId = parentResponse.body.data.id;

    // Create a submenu
    const submenuResponse = await supertest(web)
      .post(baseUrlTest)
      .set('Cookie', cookieHeader ?? '')
      .send({
        key_menu: 'submenu',
        name: 'Submenu',
        menu_id: parentId
      });

    expect(submenuResponse.status).toBe(200);

    // Delete the parent menu
    const response = await supertest(web)
      .delete(`${baseUrlTest}/${parentId}`)
      .set('Cookie', cookieHeader ?? '');

    logger.debug('Delete parent menu response', response.body);
    expect(response.status).toBe(200);
    expect(response.body.data.active).toBe('Inactive');
  });

  it('Should return correct response structure', async () => {
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

    // Delete the menu
    const response = await supertest(web)
      .delete(`${baseUrlTest}/${menuId}`)
      .set('Cookie', cookieHeader ?? '');

    logger.debug('Response structure test', response.body);
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('data');
    expect(response.body.data).toHaveProperty('id');
    expect(response.body.data).toHaveProperty('key_menu');
    expect(response.body.data).toHaveProperty('name');
    expect(response.body.data).toHaveProperty('active');
    expect(response.body.data).toHaveProperty('created_by');
    expect(response.body.data).toHaveProperty('created_at');
    expect(response.body.data).toHaveProperty('updated_by');
    expect(response.body.data).toHaveProperty('updated_at');
  });

  it('Should handle multiple delete requests for same menu', async () => {
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

    // Delete the menu multiple times
    const response1 = await supertest(web)
      .delete(`${baseUrlTest}/${menuId}`)
      .set('Cookie', cookieHeader ?? '');

    const response2 = await supertest(web)
      .delete(`${baseUrlTest}/${menuId}`)
      .set('Cookie', cookieHeader ?? '');

    const response3 = await supertest(web)
      .delete(`${baseUrlTest}/${menuId}`)
      .set('Cookie', cookieHeader ?? '');

    logger.debug('Multiple delete requests test', {
      response1: response1.body,
      response2: response2.body,
      response3: response3.body
    });

    expect(response1.status).toBe(200);
    expect(response2.status).toBe(200);
    expect(response3.status).toBe(200);
    expect(response1.body.data.active).toBe('Inactive');
    expect(response2.body.data.active).toBe('Inactive');
    expect(response3.body.data.active).toBe('Inactive');
  });
});
