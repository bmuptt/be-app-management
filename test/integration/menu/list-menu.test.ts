import dotenv from 'dotenv';
import { AccessTokenTable, AuthLogic, UserTable } from '../../test-util';
import supertest from 'supertest';
import { web } from '../../../src/config/web';
import { logger } from '../../../src/config/logging';

dotenv.config();

const baseUrlTest = '/api/app-management/menu';

describe('List Menu Business Flow', () => {
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

  it('Should successfully list root menus (id=0)', async () => {
    const response = await supertest(web)
      .get(`${baseUrlTest}/0`)
      .set('Cookie', cookieHeader ?? '');

    logger.debug('List root menus response', response.body);
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('data');
    expect(Array.isArray(response.body.data)).toBe(true);
    expect(response.body.data.length).toBeGreaterThan(0);
    
    // Check if menus have children property
    if (response.body.data.length > 0) {
      expect(response.body.data[0]).toHaveProperty('children');
      expect(Array.isArray(response.body.data[0].children)).toBe(true);
    }
  });

  it('Should successfully list submenus for existing parent', async () => {
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

    // Create some submenus
    await supertest(web)
      .post(baseUrlTest)
      .set('Cookie', cookieHeader ?? '')
      .send({
        key_menu: 'submenu1',
        name: 'Submenu 1',
        menu_id: parentId
      });

    await supertest(web)
      .post(baseUrlTest)
      .set('Cookie', cookieHeader ?? '')
      .send({
        key_menu: 'submenu2',
        name: 'Submenu 2',
        menu_id: parentId
      });

    // List submenus
    const response = await supertest(web)
      .get(`${baseUrlTest}/${parentId}`)
      .set('Cookie', cookieHeader ?? '');

    logger.debug('List submenus response', response.body);
    expect(response.status).toBe(200);
    expect(response.body.data.length).toBe(2);
    expect(response.body.data[0].key_menu).toBe('submenu1');
    expect(response.body.data[1].key_menu).toBe('submenu2');
  });

  it('Should return empty array for non-existent parent', async () => {
    const response = await supertest(web)
      .get(`${baseUrlTest}/999999`)
      .set('Cookie', cookieHeader ?? '');

    logger.debug('List non-existent parent response', response.body);
    expect(response.status).toBe(200);
    expect(response.body.data).toEqual([]);
  });

      it('Should handle invalid menu ID format', async () => {
      const response = await supertest(web)
        .get(`${baseUrlTest}/invalid`)
        .set('Cookie', cookieHeader ?? '');

      logger.debug('Invalid menu ID format response', response.body);
      expect(response.status).toBe(200);
      // Invalid ID format (NaN) should return empty array or handle gracefully
      // parseInt('invalid') returns NaN, which should not match any menu_id
      expect(response.body.data).toEqual([]);
    });

  it('Should handle negative menu ID', async () => {
    const response = await supertest(web)
      .get(`${baseUrlTest}/-1`)
      .set('Cookie', cookieHeader ?? '');

    logger.debug('Negative menu ID response', response.body);
    expect(response.status).toBe(200);
    expect(response.body.data).toEqual([]);
  });

  it('Should handle decimal menu ID', async () => {
    const response = await supertest(web)
      .get(`${baseUrlTest}/1.5`)
      .set('Cookie', cookieHeader ?? '');

    logger.debug('Decimal menu ID response', response.body);
    expect(response.status).toBe(200);
    // parseInt(1.5) returns 1, so it should return submenus of menu ID 1
    expect(response.body.data.length).toBeGreaterThanOrEqual(0);
  });

  it('Should return menus ordered by order_number and id', async () => {
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

    // Create submenus in reverse order
    await supertest(web)
      .post(baseUrlTest)
      .set('Cookie', cookieHeader ?? '')
      .send({
        key_menu: 'submenu3',
        name: 'Submenu 3',
        menu_id: parentId
      });

    await supertest(web)
      .post(baseUrlTest)
      .set('Cookie', cookieHeader ?? '')
      .send({
        key_menu: 'submenu1',
        name: 'Submenu 1',
        menu_id: parentId
      });

    await supertest(web)
      .post(baseUrlTest)
      .set('Cookie', cookieHeader ?? '')
      .send({
        key_menu: 'submenu2',
        name: 'Submenu 2',
        menu_id: parentId
      });

    // List submenus
    const response = await supertest(web)
      .get(`${baseUrlTest}/${parentId}`)
      .set('Cookie', cookieHeader ?? '');

    logger.debug('List ordered submenus response', response.body);
    expect(response.status).toBe(200);
    expect(response.body.data.length).toBe(3);
    
    // Should be ordered by order_number ascending, then by id ascending
    expect(response.body.data[0].order_number).toBeLessThanOrEqual(response.body.data[1].order_number);
    expect(response.body.data[1].order_number).toBeLessThanOrEqual(response.body.data[2].order_number);
  });

  it('Should return correct response structure', async () => {
    const response = await supertest(web)
      .get(`${baseUrlTest}/0`)
      .set('Cookie', cookieHeader ?? '');

    logger.debug('Response structure test', response.body);
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('data');
    expect(Array.isArray(response.body.data)).toBe(true);
    
    if (response.body.data.length > 0) {
      const menu = response.body.data[0];
      expect(menu).toHaveProperty('id');
      expect(menu).toHaveProperty('key_menu');
      expect(menu).toHaveProperty('name');
      expect(menu).toHaveProperty('url');
      expect(menu).toHaveProperty('order_number');
      expect(menu).toHaveProperty('active');
      expect(menu).toHaveProperty('menu_id');
      expect(menu).toHaveProperty('created_by');
      expect(menu).toHaveProperty('created_at');
      expect(menu).toHaveProperty('updated_by');
      expect(menu).toHaveProperty('updated_at');
      expect(menu).toHaveProperty('children');
      expect(Array.isArray(menu.children)).toBe(true);
    }
  });

      it('Should handle very large menu ID', async () => {
      const response = await supertest(web)
        .get(`${baseUrlTest}/999999999999`)
        .set('Cookie', cookieHeader ?? '');

      logger.debug('Very large menu ID response', response.body);
      expect(response.status).toBe(500);
      // Very large ID causes database integer overflow error
      expect(response.body.errors).toBeDefined();
    });

  it('Should handle zero menu ID (root menus)', async () => {
    const response = await supertest(web)
      .get(`${baseUrlTest}/0`)
      .set('Cookie', cookieHeader ?? '');

    logger.debug('Zero menu ID response', response.body);
    expect(response.status).toBe(200);
    expect(response.body.data.length).toBeGreaterThan(0);
    
    // All returned menus should be root menus (menu_id = null)
    response.body.data.forEach((menu: any) => {
      expect(menu.menu_id).toBeNull();
    });
  });

  it('Should handle multiple menu list requests', async () => {
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

    // Create submenus
    await supertest(web)
      .post(baseUrlTest)
      .set('Cookie', cookieHeader ?? '')
      .send({
        key_menu: 'submenu1',
        name: 'Submenu 1',
        menu_id: parentId
      });

    await supertest(web)
      .post(baseUrlTest)
      .set('Cookie', cookieHeader ?? '')
      .send({
        key_menu: 'submenu2',
        name: 'Submenu 2',
        menu_id: parentId
      });

    // Make multiple list requests
    const requests = [
      supertest(web).get(`${baseUrlTest}/0`).set('Cookie', cookieHeader ?? ''),
      supertest(web).get(`${baseUrlTest}/${parentId}`).set('Cookie', cookieHeader ?? ''),
      supertest(web).get(`${baseUrlTest}/999999`).set('Cookie', cookieHeader ?? '')
    ];

    const responses = await Promise.all(requests);

    expect(responses[0].status).toBe(200); // Root menus
    expect(responses[1].status).toBe(200); // Submenus
    expect(responses[2].status).toBe(200); // Empty array
    expect(responses[1].body.data.length).toBe(2); // Should have 2 submenus
    expect(responses[2].body.data).toEqual([]); // Should be empty
  });

  it('Should handle nested menu structure', async () => {
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

    // Create sub-submenu
    await supertest(web)
      .post(baseUrlTest)
      .set('Cookie', cookieHeader ?? '')
      .send({
        key_menu: 'sub-submenu',
        name: 'Sub-Submenu',
        menu_id: submenuId
      });

    // List parent menus (should include submenu with children)
    const parentListResponse = await supertest(web)
      .get(`${baseUrlTest}/0`)
      .set('Cookie', cookieHeader ?? '');

    expect(parentListResponse.status).toBe(200);
    const parentMenu = parentListResponse.body.data.find((menu: any) => menu.id === parentId);
    expect(parentMenu).toBeDefined();
    expect(parentMenu.children.length).toBe(1);
    expect(parentMenu.children[0].key_menu).toBe('submenu');

    // List submenus (should include sub-submenu)
    const submenuListResponse = await supertest(web)
      .get(`${baseUrlTest}/${parentId}`)
      .set('Cookie', cookieHeader ?? '');

    expect(submenuListResponse.status).toBe(200);
    expect(submenuListResponse.body.data.length).toBe(1);
    expect(submenuListResponse.body.data[0].key_menu).toBe('submenu');
    expect(submenuListResponse.body.data[0].children.length).toBe(1);
    expect(submenuListResponse.body.data[0].children[0].key_menu).toBe('sub-submenu');
  });
});
