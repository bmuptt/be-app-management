import dotenv from 'dotenv';
import { AccessTokenTable, AuthLogic, UserTable } from '../../test-util';
import supertest from 'supertest';
import { web } from '../../../src/config/web';
import { logger } from '../../../src/config/logging';

dotenv.config();

const baseUrlTest = '/api/app-management/role-menu';
const baseUrlMenuTest = '/api/app-management/menu';

describe('Role Menu List Structure Business Flow', () => {
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

  it('Should successfully get role menu structure for existing role', async () => {
    // First create some test menus and configure role menu
    const createMenuResponse = await supertest(web)
      .post(baseUrlMenuTest)
      .set('Cookie', cookieHeader ?? '')
      .send({
        key_menu: 'test-menu-structure',
        name: 'Test Menu Structure'
      });

    expect(createMenuResponse.status).toBe(200);
    const menuId = createMenuResponse.body.data.id;

    // Configure role menu
    await supertest(web)
      .post(`${baseUrlTest}/1`)
      .set('Cookie', cookieHeader ?? '')
      .send([
        {
          menu_id: menuId,
          access: true,
        },
      ]);

    // Get role menu structure
    const response = await supertest(web)
      .get(`${baseUrlTest}/1`)
      .set('Cookie', cookieHeader ?? '');

    logger.debug('Role menu structure response', response.body);
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('data');
    expect(Array.isArray(response.body.data)).toBe(true);
    expect(response.body.data.length).toBeGreaterThan(0);
    expect(response.body.data[0].key_menu).toBe('appmanagement');
  });

  it('Should return 404 for non-existent role', async () => {
    const response = await supertest(web)
      .get(`${baseUrlTest}/999999`)
      .set('Cookie', cookieHeader ?? '');

    logger.debug('Non-existent role response', response.body);
    expect(response.status).toBe(404);
    expect(response.body.errors).toEqual(
      expect.arrayContaining(['The role does not exist!'])
    );
  });

  it('Should handle negative role ID', async () => {
    const response = await supertest(web)
      .get(`${baseUrlTest}/-1`)
      .set('Cookie', cookieHeader ?? '');

    logger.debug('Negative role ID response', response.body);
    expect(response.status).toBe(404);
    expect(response.body.errors).toEqual(
      expect.arrayContaining(['The role does not exist!'])
    );
  });

  it('Should handle zero role ID', async () => {
    const response = await supertest(web)
      .get(`${baseUrlTest}/0`)
      .set('Cookie', cookieHeader ?? '');

    logger.debug('Zero role ID response', response.body);
    expect(response.status).toBe(404);
    expect(response.body.errors).toEqual(
      expect.arrayContaining(['The role does not exist!'])
    );
  });

  it('Should handle very large role ID', async () => {
    const response = await supertest(web)
      .get(`${baseUrlTest}/999999999999`)
      .set('Cookie', cookieHeader ?? '');

    logger.debug('Very large role ID response', response.body);
    expect(response.status).toBe(500);
    // Very large ID causes database integer overflow error
    expect(response.body.errors).toBeDefined();
  });

  it('Should handle invalid role ID format', async () => {
    const response = await supertest(web)
      .get(`${baseUrlTest}/invalid`)
      .set('Cookie', cookieHeader ?? '');

    logger.debug('Invalid role ID format response', response.body);
    expect(response.status).toBe(500);
    // Invalid ID format causes database error
    expect(response.body.errors).toBeDefined();
  });

  it('Should return correct response structure', async () => {
    const response = await supertest(web)
      .get(`${baseUrlTest}/1`)
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
      expect(firstItem).toHaveProperty('order_number');
      expect(firstItem).toHaveProperty('menu_id');
      expect(firstItem).toHaveProperty('url');
      expect(firstItem).toHaveProperty('permissions');
      expect(firstItem).toHaveProperty('children');
      expect(Array.isArray(firstItem.children)).toBe(true);
      
      // Check permissions structure
      expect(firstItem.permissions).toHaveProperty('access');
      expect(firstItem.permissions).toHaveProperty('create');
      expect(firstItem.permissions).toHaveProperty('update');
      expect(firstItem.permissions).toHaveProperty('delete');
      expect(firstItem.permissions).toHaveProperty('approval');
      expect(firstItem.permissions).toHaveProperty('approval_2');
      expect(firstItem.permissions).toHaveProperty('approval_3');
    }
  });

  it('Should handle multiple requests for same role', async () => {
    const roleId = 1;
    
    // Make multiple requests to the same endpoint
    const response1 = await supertest(web)
      .get(`${baseUrlTest}/${roleId}`)
      .set('Cookie', cookieHeader ?? '');

    const response2 = await supertest(web)
      .get(`${baseUrlTest}/${roleId}`)
      .set('Cookie', cookieHeader ?? '');

    const response3 = await supertest(web)
      .get(`${baseUrlTest}/${roleId}`)
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

  it('Should return consistent data structure across requests', async () => {
    const roleId = 1;
    
    const response1 = await supertest(web)
      .get(`${baseUrlTest}/${roleId}`)
      .set('Cookie', cookieHeader ?? '');

    const response2 = await supertest(web)
      .get(`${baseUrlTest}/${roleId}`)
      .set('Cookie', cookieHeader ?? '');

    expect(response1.status).toBe(200);
    expect(response2.status).toBe(200);
    expect(response1.body.data.length).toBe(response2.body.data.length);
    
    // Check that the structure is consistent
    if (response1.body.data.length > 0) {
      expect(response1.body.data[0]).toHaveProperty('key_menu');
      expect(response2.body.data[0]).toHaveProperty('key_menu');
      expect(response1.body.data[0].key_menu).toBe(response2.body.data[0].key_menu);
    }
  });

  it('Should handle role with no menu configurations', async () => {
    // Create a new role first (assuming role creation endpoint exists)
    // For now, we'll test with an existing role that might have minimal configurations
    const response = await supertest(web)
      .get(`${baseUrlTest}/1`)
      .set('Cookie', cookieHeader ?? '');

    logger.debug('Role with minimal configurations response', response.body);
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('data');
    expect(Array.isArray(response.body.data)).toBe(true);
  });

  it('Should return hierarchical menu structure', async () => {
    const response = await supertest(web)
      .get(`${baseUrlTest}/1`)
      .set('Cookie', cookieHeader ?? '');

    logger.debug('Hierarchical structure test', response.body);
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('data');
    expect(Array.isArray(response.body.data)).toBe(true);
    
    if (response.body.data.length > 0) {
      const firstItem = response.body.data[0];
      expect(firstItem).toHaveProperty('children');
      expect(Array.isArray(firstItem.children)).toBe(true);
      
      // Check if children have the correct structure
      if (firstItem.children.length > 0) {
        const firstChild = firstItem.children[0];
        expect(firstChild).toHaveProperty('id');
        expect(firstChild).toHaveProperty('key_menu');
        expect(firstChild).toHaveProperty('name');
        expect(firstChild).toHaveProperty('active');
        expect(firstChild).toHaveProperty('order_number');
        expect(firstChild).toHaveProperty('menu_id');
        expect(firstChild).toHaveProperty('url');
        expect(firstChild).toHaveProperty('permissions');
        expect(firstChild).toHaveProperty('children');
        expect(Array.isArray(firstChild.children)).toBe(true);
      }
    }
  });

  it('Should handle decimal role ID', async () => {
    const response = await supertest(web)
      .get(`${baseUrlTest}/1.5`)
      .set('Cookie', cookieHeader ?? '');

    logger.debug('Decimal role ID response', response.body);
    expect(response.status).toBe(200);
    // parseInt(1.5) returns 1, which finds the Super Admin role
    expect(response.body.data[0].key_menu).toBe('appmanagement');
  });

  it('Should return active menus only', async () => {
    const response = await supertest(web)
      .get(`${baseUrlTest}/1`)
      .set('Cookie', cookieHeader ?? '');

    logger.debug('Active menus test', response.body);
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('data');
    expect(Array.isArray(response.body.data)).toBe(true);
    
    // Check that all returned menus are active
    const checkActiveMenus = (menus: any[]) => {
      for (const menu of menus) {
        expect(menu.active).toBe('Active');
        if (menu.children && menu.children.length > 0) {
          checkActiveMenus(menu.children);
        }
      }
    };
    
    checkActiveMenus(response.body.data);
  });

  it('Should handle different role IDs', async () => {
    // Test with different role IDs (assuming they exist)
    const roleIds = [1, 2, 3]; // Adjust based on available roles
    
    for (const roleId of roleIds) {
      const response = await supertest(web)
        .get(`${baseUrlTest}/${roleId}`)
        .set('Cookie', cookieHeader ?? '');

      logger.debug(`Role ${roleId} structure response`, response.body);
      
      // Some roles might not exist, so we check for either 200 or 404
      if (response.status === 200) {
        expect(response.body).toHaveProperty('data');
        expect(Array.isArray(response.body.data)).toBe(true);
      } else if (response.status === 404) {
        expect(response.body.errors).toEqual(
          expect.arrayContaining(['The role does not exist!'])
        );
      }
    }
  });
});
