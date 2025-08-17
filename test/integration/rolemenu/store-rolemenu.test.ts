import dotenv from 'dotenv';
import { AccessTokenTable, AuthLogic, UserTable } from '../../test-util';
import supertest from 'supertest';
import { web } from '../../../src/config/web';
import { logger } from '../../../src/config/logging';
import { prismaClient } from '../../../src/config/database';

dotenv.config();

const baseUrlTest = '/api/app-management/role-menu';
const baseUrlMenuTest = '/api/app-management/menu';

describe('Role Menu Store Business Flow', () => {
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

  it('Should successfully store role menu configuration', async () => {
    // First create a test menu
    const createMenuResponse = await supertest(web)
      .post(baseUrlMenuTest)
      .set('Cookie', cookieHeader ?? '')
      .send({
        key_menu: 'test-menu',
        name: 'Test Menu'
      });

    expect(createMenuResponse.status).toBe(200);
    const menuId = createMenuResponse.body.data.id;

    // Store role menu configuration
    const response = await supertest(web)
      .post(`${baseUrlTest}/1`)
      .set('Cookie', cookieHeader ?? '')
      .send([
        {
          menu_id: menuId,
          access: true,
        },
      ]);

    logger.debug('Store role menu response', response.body);
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('data');
  });

  it('Should return 404 for non-existent role', async () => {
    const response = await supertest(web)
      .post(`${baseUrlTest}/999999`)
      .set('Cookie', cookieHeader ?? '')
      .send([
        {
          menu_id: 1,
          access: true,
        },
      ]);

    logger.debug('Non-existent role response', response.body);
    expect(response.status).toBe(404);
    expect(response.body.errors).toEqual(
      expect.arrayContaining(['Role or Menu not found!'])
    );
  });

  it('Should return 404 for non-existent menu', async () => {
    const response = await supertest(web)
      .post(`${baseUrlTest}/1`)
      .set('Cookie', cookieHeader ?? '')
      .send([
        {
          menu_id: 999999,
          access: true,
        },
      ]);

    logger.debug('Non-existent menu response', response.body);
    expect(response.status).toBe(404);
    expect(response.body.errors).toEqual(
      expect.arrayContaining(['Role or Menu not found!'])
    );
  });

  it('Should successfully store multiple menu configurations', async () => {
    // Create multiple test menus
    const menuIds: number[] = [];
    for (let i = 1; i <= 3; i++) {
      const createMenuResponse = await supertest(web)
        .post(baseUrlMenuTest)
        .set('Cookie', cookieHeader ?? '')
        .send({
          key_menu: `test-menu-${i}`,
          name: `Test Menu ${i}`
        });

      expect(createMenuResponse.status).toBe(200);
      menuIds.push(createMenuResponse.body.data.id);
    }

    // Store multiple menu configurations
    const response = await supertest(web)
      .post(`${baseUrlTest}/1`)
      .set('Cookie', cookieHeader ?? '')
      .send([
        {
          menu_id: menuIds[0],
          access: true,
        },
        {
          menu_id: menuIds[1],
          access: true,
          create: true,
        },
        {
          menu_id: menuIds[2],
          access: true,
          update: true,
        },
      ]);

    logger.debug('Multiple menu configurations response', response.body);
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('data');
  });

  it('Should handle empty menu array', async () => {
    const response = await supertest(web)
      .post(`${baseUrlTest}/1`)
      .set('Cookie', cookieHeader ?? '')
      .send([]);

    logger.debug('Empty menu array response', response.body);
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('data');
  });

  it('Should handle invalid menu data structure', async () => {
    const response = await supertest(web)
      .post(`${baseUrlTest}/1`)
      .set('Cookie', cookieHeader ?? '')
      .send([
        {
          menu_id: 'invalid',
          access: true,
        },
      ]);

    logger.debug('Invalid menu data response', response.body);
    expect(response.status).toBe(500);
    // Invalid ID format causes database error
    expect(response.body.errors).toBeDefined();
  });

  it('Should handle negative role ID', async () => {
    const response = await supertest(web)
      .post(`${baseUrlTest}/-1`)
      .set('Cookie', cookieHeader ?? '')
      .send([
        {
          menu_id: 1,
          access: true,
        },
      ]);

    logger.debug('Negative role ID response', response.body);
    expect(response.status).toBe(404);
    expect(response.body.errors).toEqual(
      expect.arrayContaining(['Role or Menu not found!'])
    );
  });

  it('Should handle zero role ID', async () => {
    const response = await supertest(web)
      .post(`${baseUrlTest}/0`)
      .set('Cookie', cookieHeader ?? '')
      .send([
        {
          menu_id: 1,
          access: true,
        },
      ]);

    logger.debug('Zero role ID response', response.body);
    expect(response.status).toBe(404);
    expect(response.body.errors).toEqual(
      expect.arrayContaining(['Role or Menu not found!'])
    );
  });

  it('Should handle very large role ID', async () => {
    const response = await supertest(web)
      .post(`${baseUrlTest}/999999999999`)
      .set('Cookie', cookieHeader ?? '')
      .send([
        {
          menu_id: 1,
          access: true,
        },
      ]);

    logger.debug('Very large role ID response', response.body);
    expect(response.status).toBe(500);
    // Very large ID causes database integer overflow error
    expect(response.body.errors).toBeDefined();
  });

  it('Should handle invalid role ID format', async () => {
    const response = await supertest(web)
      .post(`${baseUrlTest}/invalid`)
      .set('Cookie', cookieHeader ?? '')
      .send([
        {
          menu_id: 1,
          access: true,
        },
      ]);

    logger.debug('Invalid role ID format response', response.body);
    expect(response.status).toBe(500);
    // Invalid ID format causes database error
    expect(response.body.errors).toBeDefined();
  });

  it('Should verify no duplicate entries in database', async () => {
    // First create a test menu
    const createMenuResponse = await supertest(web)
      .post(baseUrlMenuTest)
      .set('Cookie', cookieHeader ?? '')
      .send({
        key_menu: 'test-menu-duplicate',
        name: 'Test Menu Duplicate'
      });

    expect(createMenuResponse.status).toBe(200);
    const menuId = createMenuResponse.body.data.id;

    // Store role menu configuration multiple times
    const response1 = await supertest(web)
      .post(`${baseUrlTest}/1`)
      .set('Cookie', cookieHeader ?? '')
      .send([
        {
          menu_id: menuId,
          access: true,
          create: true,
        },
      ]);

    const response2 = await supertest(web)
      .post(`${baseUrlTest}/1`)
      .set('Cookie', cookieHeader ?? '')
      .send([
        {
          menu_id: menuId,
          access: true,
          create: true,
        },
      ]);

    logger.debug('Duplicate entries test', {
      response1: response1.body,
      response2: response2.body
    });

    expect(response1.status).toBe(200);
    expect(response2.status).toBe(200);

    // Verify no duplicate entries in database
    const roleMenus = await prismaClient.roleMenu.findMany({
      where: {
        role_id: 1,
        menu_id: menuId
      }
    });

    expect(roleMenus.length).toBe(1);
  });

  it('Should handle different permission combinations', async () => {
    // Create a test menu
    const createMenuResponse = await supertest(web)
      .post(baseUrlMenuTest)
      .set('Cookie', cookieHeader ?? '')
      .send({
        key_menu: 'test-menu-permissions',
        name: 'Test Menu Permissions'
      });

    expect(createMenuResponse.status).toBe(200);
    const menuId = createMenuResponse.body.data.id;

    // Test different permission combinations
    const permissionCombinations = [
      { access: true },
      { access: true, create: true },
      { access: true, update: true },
      { access: true, delete: true },
      { access: true, create: true, update: true },
      { access: true, create: true, update: true, delete: true },
    ];

    for (const permissions of permissionCombinations) {
      const response = await supertest(web)
        .post(`${baseUrlTest}/1`)
        .set('Cookie', cookieHeader ?? '')
        .send([
          {
            menu_id: menuId,
            ...permissions,
          },
        ]);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('data');
    }
  });
});
