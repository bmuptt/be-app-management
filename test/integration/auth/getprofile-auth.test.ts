import dotenv from 'dotenv';
import { AccessTokenTable, AuthLogic, UserTable } from '../../test-util';
import supertest from 'supertest';
import { web } from '../../../src/config/web';
import { logger } from '../../../src/config/logging';

dotenv.config();

const baseUrlMenuTest = '/api/app-management/menu';
const baseUrlRoleTest = '/api/app-management/role';
const baseUrlRoleMenuTest = '/api/app-management/role-menu';

describe('Get Profile Business Flow', () => {
  beforeEach(async () => {
    await UserTable.delete();
    await AccessTokenTable.delete();
    await UserTable.resetUserIdSequence();
    await AccessTokenTable.resetAccessTokenIdSequence();
    await UserTable.callUserSeed();
  });

  afterEach(async () => {
    await UserTable.delete();
    await AccessTokenTable.delete();
  });

  it('Should successfully retrieve profile with valid token', async () => {
    const loginResponse = await AuthLogic.getLoginSuperAdmin();
    expect(loginResponse.status).toBe(200);

    const cookies = loginResponse.headers['set-cookie'];
    const cookieHeader = Array.isArray(cookies) ? cookies.join('; ') : cookies;

    const response = await supertest(web)
      .get('/api/profile')
      .set('Cookie', cookieHeader);

    logger.debug('Profile retrieval success', response.body);
    expect(response.status).toBe(200);
    expect(response.body.profile).toBeDefined();
    expect(response.body.menu).toBeDefined();
    expect(response.body.profile.email).toBe(process.env.EMAIL_ADMIN);
    expect(response.body.profile.password).toBeUndefined();
  });

  it('Should return proper profile data structure', async () => {
    const loginResponse = await AuthLogic.getLoginSuperAdmin();
    expect(loginResponse.status).toBe(200);

    const cookies = loginResponse.headers['set-cookie'];
    const cookieHeader = Array.isArray(cookies) ? cookies.join('; ') : cookies;

    const response = await supertest(web)
      .get('/api/profile')
      .set('Cookie', cookieHeader);

    logger.debug('Profile data structure', response.body);
    expect(response.status).toBe(200);
    expect(response.body.profile).toHaveProperty('id');
    expect(response.body.profile).toHaveProperty('email');
    expect(response.body.profile).toHaveProperty('name');
    expect(response.body.profile).toHaveProperty('gender');
    expect(response.body.profile).toHaveProperty('birthdate');
    expect(response.body.profile).toHaveProperty('role_id');
    expect(response.body.profile).toHaveProperty('created_at');
    expect(response.body.profile).toHaveProperty('updated_at');
    expect(response.body.profile).not.toHaveProperty('password');
  });

  it('Should include menu data in profile response', async () => {
    const loginResponse = await AuthLogic.getLoginSuperAdmin();
    expect(loginResponse.status).toBe(200);

    const cookies = loginResponse.headers['set-cookie'];
    const cookieHeader = Array.isArray(cookies) ? cookies.join('; ') : cookies;

    const response = await supertest(web)
      .get('/api/profile')
      .set('Cookie', cookieHeader);

    logger.debug('Profile with menu data', response.body);
    expect(response.status).toBe(200);
    expect(response.body.menu).toBeDefined();
    expect(Array.isArray(response.body.menu)).toBe(true);
    expect(response.body.menu.length).toBeGreaterThan(0);
  });

  it('Should return empty menu when role is deleted', async () => {
    const loginResponse = await AuthLogic.getLoginSuperAdmin();
    expect(loginResponse.status).toBe(200);

    const cookies = loginResponse.headers['set-cookie'];
    const cookieHeader = Array.isArray(cookies) ? cookies.join('; ') : cookies;

    // Delete the role
    await supertest(web)
      .delete(`${baseUrlRoleTest}/1`)
      .set('Cookie', cookieHeader);

    const response = await supertest(web)
      .get('/api/profile')
      .set('Cookie', cookieHeader);

    logger.debug('Profile with deleted role', response.body);
    expect(response.status).toBe(200);
    expect(response.body.menu.length).toBe(0);
  });

  it('Should handle complex menu hierarchy with nested submenus', async () => {
    const loginResponse = await AuthLogic.getLoginSuperAdmin();
    expect(loginResponse.status).toBe(200);

    const cookies = loginResponse.headers['set-cookie'];
    const cookieHeader = Array.isArray(cookies) ? cookies.join('; ') : cookies;

    // Create submenus
    await supertest(web)
      .post(baseUrlMenuTest)
      .set('Cookie', cookieHeader)
      .send({
        key_menu: 'submenuagain',
        name: 'Submenuagain',
        url: '/submenuagain',
        menu_id: 3,
      });

    await supertest(web)
      .post(baseUrlMenuTest)
      .set('Cookie', cookieHeader)
      .send({
        key_menu: 'submenuagainagain',
        name: 'Submenuagainagain',
        url: '/submenuagainagain',
        menu_id: 6,
      });

    // Assign role menu permissions
    await supertest(web)
      .post(`${baseUrlRoleMenuTest}/1`)
      .set('Cookie', cookieHeader)
      .send([
        {
          menu_id: 6,
          access: true,
          create: true,
        },
        {
          menu_id: 7,
          access: true,
          create: true,
        },
      ]);

    // Sort menu
    await supertest(web)
      .post(`${baseUrlMenuTest}/sort/1`)
      .set('Cookie', cookieHeader)
      .send({
        list_menu: [
          { id: 3 },
          { id: 2 },
          { id: 4 },
          { id: 5 },
        ],
      });

    const response = await supertest(web)
      .get('/api/profile')
      .set('Cookie', cookieHeader);

    logger.debug('Profile with complex menu hierarchy', response.body);
    expect(response.status).toBe(200);
    expect(response.body.menu[0].children.length).toBe(4);
    expect(response.body.menu[0].children[0].children.length).toBe(1);
    expect(response.body.menu[0].children[1].children.length).toBe(0);
  });

  it('Should handle menu structure with different access levels', async () => {
    const loginResponse = await AuthLogic.getLoginSuperAdmin();
    expect(loginResponse.status).toBe(200);

    const cookies = loginResponse.headers['set-cookie'];
    const cookieHeader = Array.isArray(cookies) ? cookies.join('; ') : cookies;

    // Create menu with different access levels
    await supertest(web)
      .post(baseUrlMenuTest)
      .set('Cookie', cookieHeader)
      .send({
        key_menu: 'readonly_menu',
        name: 'Read Only Menu',
        url: '/readonly',
        menu_id: 3,
      });

    // Assign role menu with read-only access
    await supertest(web)
      .post(`${baseUrlRoleMenuTest}/1`)
      .set('Cookie', cookieHeader)
      .send([
        {
          menu_id: 6,
          access: true,
          create: false,
        },
      ]);

    const response = await supertest(web)
      .get('/api/profile')
      .set('Cookie', cookieHeader);

    logger.debug('Profile with different access levels', response.body);
    expect(response.status).toBe(200);
    expect(response.body.menu).toBeDefined();
  });

  it('Should handle concurrent profile requests', async () => {
    const loginResponse = await AuthLogic.getLoginSuperAdmin();
    expect(loginResponse.status).toBe(200);

    const cookies = loginResponse.headers['set-cookie'];
    const cookieHeader = Array.isArray(cookies) ? cookies.join('; ') : cookies;

    // Make multiple concurrent requests
    const promises = Array(5).fill(null).map(() =>
      supertest(web)
        .get('/api/profile')
        .set('Cookie', cookieHeader)
    );

    const responses = await Promise.all(promises);

    responses.forEach((response, index) => {
      logger.debug(`Concurrent profile request ${index + 1}`, response.body);
      expect(response.status).toBe(200);
      expect(response.body.profile).toBeDefined();
      expect(response.body.menu).toBeDefined();
    });
  });

  it('Should handle profile request with query parameters (should be ignored)', async () => {
    const loginResponse = await AuthLogic.getLoginSuperAdmin();
    expect(loginResponse.status).toBe(200);

    const cookies = loginResponse.headers['set-cookie'];
    const cookieHeader = Array.isArray(cookies) ? cookies.join('; ') : cookies;

    const response = await supertest(web)
      .get('/api/profile?include=extra&data=test')
      .set('Cookie', cookieHeader);

    logger.debug('Profile with query parameters', response.body);
    expect(response.status).toBe(200);
    expect(response.body.profile).toBeDefined();
    expect(response.body.menu).toBeDefined();
  });
});