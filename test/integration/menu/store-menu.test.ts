import dotenv from 'dotenv';
import { AccessTokenTable, AuthLogic, UserTable } from '../../test-util';
import supertest from 'supertest';
import { web } from '../../../src/config/web';
import { logger } from '../../../src/config/logging';

dotenv.config();

const baseUrlTest = '/api/app-management/menu';

describe('Store Menu Business Flow', () => {
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

  it('Should successfully create a new menu', async () => {
    const response = await supertest(web)
      .post(baseUrlTest)
      .set('Cookie', cookieHeader ?? '')
      .send({
        key_menu: 'test-menu',
        name: 'Test Menu',
        url: '/test-menu'
      });

    logger.debug('Store menu response', response.body);
    expect(response.status).toBe(200);
    expect(response.body.message).toBe('Success to add data menu.');
    expect(response.body.data).toBeDefined();
    expect(response.body.data.key_menu).toBe('test-menu');
    expect(response.body.data.name).toBe('Test Menu');
    expect(response.body.data.url).toBe('/test-menu');
    expect(response.body.data.active).toBe('Active');
    expect(response.body.data.created_by).toBe(1); // Admin user ID
    expect(response.body.data.order_number).toBe(2); // First menu after seeded data
    expect(response.body.data.menu_id).toBeNull(); // Root menu
  });

  it('Should successfully create a submenu', async () => {
    // First create a parent menu
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
    const response = await supertest(web)
      .post(baseUrlTest)
      .set('Cookie', cookieHeader ?? '')
      .send({
        key_menu: 'sub-menu',
        name: 'Sub Menu',
        url: '/parent/sub-menu',
        menu_id: parentId
      });

    logger.debug('Store submenu response', response.body);
    expect(response.status).toBe(200);
    expect(response.body.data.key_menu).toBe('sub-menu');
    expect(response.body.data.name).toBe('Sub Menu');
    expect(response.body.data.url).toBe('/parent/sub-menu');
    expect(response.body.data.menu_id).toBe(parentId);
    expect(response.body.data.order_number).toBe(1); // First submenu
  });

  it('Should handle duplicate key_menu', async () => {
    // First create a menu
    const createResponse1 = await supertest(web)
      .post(baseUrlTest)
      .set('Cookie', cookieHeader ?? '')
      .send({
        key_menu: 'duplicate-menu',
        name: 'First Menu'
      });

    expect(createResponse1.status).toBe(200);

    // Try to create another menu with the same key_menu
    const createResponse2 = await supertest(web)
      .post(baseUrlTest)
      .set('Cookie', cookieHeader ?? '')
      .send({
        key_menu: 'duplicate-menu',
        name: 'Second Menu'
      });

    logger.debug('Duplicate key_menu response', createResponse2.body);
    expect(createResponse2.status).toBe(400);
    expect(createResponse2.body.errors).toContain('The key menu cannot be the same!');
  });

  it('Should handle case-insensitive key_menu conversion', async () => {
    const response = await supertest(web)
      .post(baseUrlTest)
      .set('Cookie', cookieHeader ?? '')
      .send({
        key_menu: 'UPPERCASE-MENU',
        name: 'Uppercase Menu'
      });

    logger.debug('Case-insensitive key_menu response', response.body);
    expect(response.status).toBe(200);
    expect(response.body.data.key_menu).toBe('uppercase-menu'); // Converted to lowercase
  });

  it('Should handle missing key_menu field', async () => {
    const response = await supertest(web)
      .post(baseUrlTest)
      .set('Cookie', cookieHeader ?? '')
      .send({
        name: 'Test Menu'
      });

    logger.debug('Missing key_menu field response', response.body);
    expect(response.status).toBe(400);
    expect(response.body.errors).toContain('The key menu is required!');
  });

  it('Should handle missing name field', async () => {
    const response = await supertest(web)
      .post(baseUrlTest)
      .set('Cookie', cookieHeader ?? '')
      .send({
        key_menu: 'test-menu'
      });

    logger.debug('Missing name field response', response.body);
    expect(response.status).toBe(400);
    expect(response.body.errors).toContain('The name is required!');
  });

  it('Should handle empty key_menu field', async () => {
    const response = await supertest(web)
      .post(baseUrlTest)
      .set('Cookie', cookieHeader ?? '')
      .send({
        key_menu: '',
        name: 'Test Menu'
      });

    logger.debug('Empty key_menu field response', response.body);
    expect(response.status).toBe(400);
    expect(response.body.errors).toContain('The key menu is required!');
  });

  it('Should handle empty name field', async () => {
    const response = await supertest(web)
      .post(baseUrlTest)
      .set('Cookie', cookieHeader ?? '')
      .send({
        key_menu: 'test-menu',
        name: ''
      });

    logger.debug('Empty name field response', response.body);
    expect(response.status).toBe(400);
    expect(response.body.errors).toContain('The name is required!');
  });

  it('Should handle non-existent parent menu_id', async () => {
    const response = await supertest(web)
      .post(baseUrlTest)
      .set('Cookie', cookieHeader ?? '')
      .send({
        key_menu: 'sub-menu',
        name: 'Sub Menu',
        menu_id: 999999
      });

    logger.debug('Non-existent parent menu_id response', response.body);
    expect(response.status).toBe(404);
    expect(response.body.errors).toContain('The parent menu is not found!');
  });

  it('Should handle invalid parent menu_id format', async () => {
    const response = await supertest(web)
      .post(baseUrlTest)
      .set('Cookie', cookieHeader ?? '')
      .send({
        key_menu: 'sub-menu',
        name: 'Sub Menu',
        menu_id: 'invalid'
      });

    logger.debug('Invalid parent menu_id format response', response.body);
    expect(response.status).toBe(500);
    // Invalid ID format causes database error
    expect(response.body.errors).toBeDefined();
  });

  it('Should handle null parent menu_id (root menu)', async () => {
    const response = await supertest(web)
      .post(baseUrlTest)
      .set('Cookie', cookieHeader ?? '')
      .send({
        key_menu: 'root-menu',
        name: 'Root Menu',
        menu_id: null
      });

    logger.debug('Null parent menu_id response', response.body);
    expect(response.status).toBe(200);
    expect(response.body.data.menu_id).toBeNull();
  });

  it('Should handle undefined parent menu_id (root menu)', async () => {
    const response = await supertest(web)
      .post(baseUrlTest)
      .set('Cookie', cookieHeader ?? '')
      .send({
        key_menu: 'root-menu-2',
        name: 'Root Menu 2'
        // menu_id is undefined
      });

    logger.debug('Undefined parent menu_id response', response.body);
    expect(response.status).toBe(200);
    expect(response.body.data.menu_id).toBeNull();
  });

  it('Should handle special characters in key_menu and name', async () => {
    const response = await supertest(web)
      .post(baseUrlTest)
      .set('Cookie', cookieHeader ?? '')
      .send({
        key_menu: 'special-menu-@#$%^&*()',
        name: 'Special Menu @#$%^&*()',
        url: '/special-menu'
      });

    logger.debug('Special characters response', response.body);
    expect(response.status).toBe(200);
    expect(response.body.data.key_menu).toBe('special-menu-@#$%^&*()');
    expect(response.body.data.name).toBe('Special Menu @#$%^&*()');
  });

  it('Should handle Unicode characters in key_menu and name', async () => {
    const response = await supertest(web)
      .post(baseUrlTest)
      .set('Cookie', cookieHeader ?? '')
      .send({
        key_menu: 'unicode-menu-角色-役割',
        name: 'Unicode Menu 角色 役割',
        url: '/unicode-menu'
      });

    logger.debug('Unicode characters response', response.body);
    expect(response.status).toBe(200);
    expect(response.body.data.key_menu).toBe('unicode-menu-角色-役割');
    expect(response.body.data.name).toBe('Unicode Menu 角色 役割');
  });

  it('Should handle very long key_menu and name', async () => {
    const longKeyMenu = 'a'.repeat(255); // Maximum allowed length
    const longName = 'A'.repeat(255);
    
    const response = await supertest(web)
      .post(baseUrlTest)
      .set('Cookie', cookieHeader ?? '')
      .send({
        key_menu: longKeyMenu,
        name: longName,
        url: '/long-menu'
      });

    logger.debug('Very long key_menu and name response', response.body);
    expect(response.status).toBe(200);
    expect(response.body.data.key_menu).toBe(longKeyMenu);
    expect(response.body.data.name).toBe(longName);
  });

  it('Should handle multiple submenus with correct order_number', async () => {
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

    // Create multiple submenus
    const submenus = ['sub1', 'sub2', 'sub3'];
    const createdSubmenus: any[] = [];

    for (const submenu of submenus) {
      const response = await supertest(web)
        .post(baseUrlTest)
        .set('Cookie', cookieHeader ?? '')
        .send({
          key_menu: submenu,
          name: `Submenu ${submenu}`,
          menu_id: parentId
        });

      expect(response.status).toBe(200);
      createdSubmenus.push(response.body.data);
    }

    // Check order numbers are sequential
    expect(createdSubmenus[0].order_number).toBe(1);
    expect(createdSubmenus[1].order_number).toBe(2);
    expect(createdSubmenus[2].order_number).toBe(3);
  });

  it('Should return correct response structure', async () => {
    const response = await supertest(web)
      .post(baseUrlTest)
      .set('Cookie', cookieHeader ?? '')
      .send({
        key_menu: 'structure-test',
        name: 'Structure Test Menu',
        url: '/structure-test'
      });

    logger.debug('Response structure test', response.body);
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('message');
    expect(response.body).toHaveProperty('data');
    expect(response.body.message).toBe('Success to add data menu.');
    expect(response.body.data).toHaveProperty('id');
    expect(response.body.data).toHaveProperty('key_menu');
    expect(response.body.data).toHaveProperty('name');
    expect(response.body.data).toHaveProperty('url');
    expect(response.body.data).toHaveProperty('order_number');
    expect(response.body.data).toHaveProperty('active');
    expect(response.body.data).toHaveProperty('menu_id');
    expect(response.body.data).toHaveProperty('created_by');
    expect(response.body.data).toHaveProperty('created_at');
    expect(response.body.data).toHaveProperty('updated_by');
    expect(response.body.data).toHaveProperty('updated_at');
  });

  it('Should handle whitespace-only key_menu and name', async () => {
    const response = await supertest(web)
      .post(baseUrlTest)
      .set('Cookie', cookieHeader ?? '')
      .send({
        key_menu: '   ',
        name: '   '
      });

    logger.debug('Whitespace-only response', response.body);
    expect(response.status).toBe(200);
    expect(response.body.data.key_menu).toBe('   ');
    expect(response.body.data.name).toBe('   ');
  });
});
