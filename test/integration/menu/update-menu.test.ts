import dotenv from 'dotenv';
import { AccessTokenTable, AuthLogic, UserTable } from '../../test-util';
import supertest from 'supertest';
import { web } from '../../../src/config/web';
import { logger } from '../../../src/config/logging';

dotenv.config();

const baseUrlTest = '/api/app-management/menu';

describe('Menu Update Business Flow', () => {
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

  it('Should successfully update menu', async () => {
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

    // Update the menu
    const updateData = {
      key_menu: 'updated-menu',
      name: 'Updated Menu'
    };

    const response = await supertest(web)
      .patch(`${baseUrlTest}/${menuId}`)
      .set('Cookie', cookieHeader ?? '')
      .send(updateData);

    logger.debug('Menu update response', response.body);
    expect(response.status).toBe(200);
    expect(response.body.data).toBeDefined();
    expect(response.body.data.id).toBe(menuId);
    expect(response.body.data.key_menu).toBe('updated-menu');
    expect(response.body.data.name).toBe('Updated Menu');
    expect(response.body.data.menu_id).toBe(null);
    expect(response.body.data.active).toBe('Active');
  });

  it('Should return 404 for non-existent menu ID', async () => {
    const updateData = {
      key_menu: 'updated-menu',
      name: 'Updated Menu'
    };

    const response = await supertest(web)
      .patch(`${baseUrlTest}/999`)
      .set('Cookie', cookieHeader ?? '')
      .send(updateData);

    logger.debug('Non-existent menu update response', response.body);
    expect(response.status).toBe(404);
    expect(response.body.errors).toBeDefined();
  });

  it('Should handle duplicate key_menu', async () => {
    // Create first menu
    const createResponse1 = await supertest(web)
      .post(baseUrlTest)
      .set('Cookie', cookieHeader ?? '')
      .send({
        key_menu: 'menu-1',
        name: 'Menu 1'
      });

    expect(createResponse1.status).toBe(200);
    const menuId1 = createResponse1.body.data.id;

    // Create second menu
    const createResponse2 = await supertest(web)
      .post(baseUrlTest)
      .set('Cookie', cookieHeader ?? '')
      .send({
        key_menu: 'menu-2',
        name: 'Menu 2'
      });

    expect(createResponse2.status).toBe(200);
    const menuId2 = createResponse2.body.data.id;

    // Try to update second menu with first menu's key_menu
    const updateData = {
      key_menu: 'menu-1',
      name: 'Updated Menu 2'
    };

    const response = await supertest(web)
      .patch(`${baseUrlTest}/${menuId2}`)
      .set('Cookie', cookieHeader ?? '')
      .send(updateData);

    logger.debug('Duplicate key_menu response', response.body);
    expect(response.status).toBe(400);
    expect(response.body.errors).toBeDefined();
  });

  it('Should handle missing key_menu', async () => {
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

    // Try to update without key_menu
    const updateData = {
      name: 'Updated Menu'
    };

    const response = await supertest(web)
      .patch(`${baseUrlTest}/${menuId}`)
      .set('Cookie', cookieHeader ?? '')
      .send(updateData);

    logger.debug('Missing key_menu response', response.body);
    expect(response.status).toBe(400);
    expect(response.body.errors).toBeDefined();
  });

  it('Should handle empty key_menu', async () => {
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

    // Try to update with empty key_menu
    const updateData = {
      key_menu: '',
      name: 'Updated Menu'
    };

    const response = await supertest(web)
      .patch(`${baseUrlTest}/${menuId}`)
      .set('Cookie', cookieHeader ?? '')
      .send(updateData);

    logger.debug('Empty key_menu response', response.body);
    expect(response.status).toBe(400);
    expect(response.body.errors).toBeDefined();
  });

  it('Should handle missing name', async () => {
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

    // Try to update without name
    const updateData = {
      key_menu: 'updated-menu'
    };

    const response = await supertest(web)
      .patch(`${baseUrlTest}/${menuId}`)
      .set('Cookie', cookieHeader ?? '')
      .send(updateData);

    logger.debug('Missing name response', response.body);
    expect(response.status).toBe(400);
    expect(response.body.errors).toBeDefined();
  });

  it('Should handle empty name', async () => {
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

    // Try to update with empty name
    const updateData = {
      key_menu: 'updated-menu',
      name: ''
    };

    const response = await supertest(web)
      .patch(`${baseUrlTest}/${menuId}`)
      .set('Cookie', cookieHeader ?? '')
      .send(updateData);

    logger.debug('Empty name response', response.body);
    expect(response.status).toBe(400);
    expect(response.body.errors).toBeDefined();
  });

  it('Should handle very long key_menu', async () => {
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

    // Try to update with very long key_menu
    const longKeyMenu = 'a'.repeat(256); // Exceeds 255 character limit
    const updateData = {
      key_menu: longKeyMenu,
      name: 'Updated Menu'
    };

    const response = await supertest(web)
      .patch(`${baseUrlTest}/${menuId}`)
      .set('Cookie', cookieHeader ?? '')
      .send(updateData);

    logger.debug('Very long key_menu response', response.body);
    expect(response.status).toBe(500);
    expect(response.body.errors).toBeDefined();
  });

  it('Should handle very long name', async () => {
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

    // Try to update with very long name
    const longName = 'a'.repeat(256); // Exceeds 255 character limit
    const updateData = {
      key_menu: 'updated-menu',
      name: longName
    };

    const response = await supertest(web)
      .patch(`${baseUrlTest}/${menuId}`)
      .set('Cookie', cookieHeader ?? '')
      .send(updateData);

    logger.debug('Very long name response', response.body);
    expect(response.status).toBe(500);
    expect(response.body.errors).toBeDefined();
  });

  it('Should handle special characters in key_menu and name', async () => {
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

    // Update with special characters
    const updateData = {
      key_menu: 'menu-with-special-chars-@#$%^&*()',
      name: 'Menu with Special Characters @#$%^&*()'
    };

    const response = await supertest(web)
      .patch(`${baseUrlTest}/${menuId}`)
      .set('Cookie', cookieHeader ?? '')
      .send(updateData);

    logger.debug('Special characters response', response.body);
    expect(response.status).toBe(200);
    expect(response.body.data.key_menu).toBe('menu-with-special-chars-@#$%^&*()');
    expect(response.body.data.name).toBe('Menu with Special Characters @#$%^&*()');
  });

  it('Should handle Unicode characters in key_menu and name', async () => {
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

    // Update with Unicode characters
    const updateData = {
      key_menu: 'menu-with-unicode-角色-役割',
      name: 'Menu with Unicode Characters 角色 役割'
    };

    const response = await supertest(web)
      .patch(`${baseUrlTest}/${menuId}`)
      .set('Cookie', cookieHeader ?? '')
      .send(updateData);

    logger.debug('Unicode characters response', response.body);
    expect(response.status).toBe(200);
    expect(response.body.data.key_menu).toBe('menu-with-unicode-角色-役割');
    expect(response.body.data.name).toBe('Menu with Unicode Characters 角色 役割');
  });

  it('Should handle negative menu ID in URL', async () => {
    const updateData = {
      key_menu: 'updated-menu',
      name: 'Updated Menu'
    };

    const response = await supertest(web)
      .patch(`${baseUrlTest}/-1`)
      .set('Cookie', cookieHeader ?? '')
      .send(updateData);

    logger.debug('Negative menu ID response', response.body);
    expect(response.status).toBe(404);
    expect(response.body.errors).toBeDefined();
  });

  it('Should handle zero menu ID in URL', async () => {
    const updateData = {
      key_menu: 'updated-menu',
      name: 'Updated Menu'
    };

    const response = await supertest(web)
      .patch(`${baseUrlTest}/0`)
      .set('Cookie', cookieHeader ?? '')
      .send(updateData);

    logger.debug('Zero menu ID response', response.body);
    expect(response.status).toBe(404);
    expect(response.body.errors).toBeDefined();
  });

  it('Should handle very large menu ID in URL', async () => {
    const updateData = {
      key_menu: 'updated-menu',
      name: 'Updated Menu'
    };

    const response = await supertest(web)
      .patch(`${baseUrlTest}/999999999999`)
      .set('Cookie', cookieHeader ?? '')
      .send(updateData);

    logger.debug('Very large menu ID response', response.body);
    expect(response.status).toBe(500);
    expect(response.body.errors).toBeDefined();
  });

  it('Should handle decimal menu ID in URL', async () => {
    const updateData = {
      key_menu: 'updated-menu',
      name: 'Updated Menu'
    };

    const response = await supertest(web)
      .patch(`${baseUrlTest}/1.5`)
      .set('Cookie', cookieHeader ?? '')
      .send(updateData);

    logger.debug('Decimal menu ID response', response.body);
    // parseInt("1.5") returns 1, which is a valid existing menu ID
    expect(response.status).toBe(200);
    expect(response.body.data.id).toBe(1);
  });

  it('Should handle invalid menu ID format in URL', async () => {
    const updateData = {
      key_menu: 'updated-menu',
      name: 'Updated Menu'
    };

    const response = await supertest(web)
      .patch(`${baseUrlTest}/invalid`)
      .set('Cookie', cookieHeader ?? '')
      .send(updateData);

    logger.debug('Invalid menu ID format response', response.body);
    expect(response.status).toBe(500);
    expect(response.body.errors).toBeDefined();
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

    // Update the menu
    const updateData = {
      key_menu: 'updated-menu',
      name: 'Updated Menu'
    };

    const response = await supertest(web)
      .patch(`${baseUrlTest}/${menuId}`)
      .set('Cookie', cookieHeader ?? '')
      .send(updateData);

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

  it('Should handle multiple updates on same menu', async () => {
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

    // First update
    const updateData1 = {
      key_menu: 'updated-menu-1',
      name: 'Updated Menu 1'
    };

    const response1 = await supertest(web)
      .patch(`${baseUrlTest}/${menuId}`)
      .set('Cookie', cookieHeader ?? '')
      .send(updateData1);

    logger.debug('First update response', response1.body);
    expect(response1.status).toBe(200);
    expect(response1.body.data.key_menu).toBe('updated-menu-1');
    expect(response1.body.data.name).toBe('Updated Menu 1');

    // Second update
    const updateData2 = {
      key_menu: 'updated-menu-2',
      name: 'Updated Menu 2'
    };

    const response2 = await supertest(web)
      .patch(`${baseUrlTest}/${menuId}`)
      .set('Cookie', cookieHeader ?? '')
      .send(updateData2);

    logger.debug('Second update response', response2.body);
    expect(response2.status).toBe(200);
    expect(response2.body.data.key_menu).toBe('updated-menu-2');
    expect(response2.body.data.name).toBe('Updated Menu 2');
  });
});
