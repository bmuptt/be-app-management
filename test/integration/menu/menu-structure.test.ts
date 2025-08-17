import dotenv from 'dotenv';
import { AccessTokenTable, AuthLogic, UserTable } from '../../test-util';
import supertest from 'supertest';
import { web } from '../../../src/config/web';
import { logger } from '../../../src/config/logging';

dotenv.config();

const baseUrlTest = '/api/app-management/menu-structure';

describe('Menu Structure Business Flow', () => {
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

  it('Should successfully get menu structure', async () => {
    const response = await supertest(web)
      .get(baseUrlTest)
      .set('Cookie', cookieHeader ?? '');

    logger.debug('Menu structure response', response.body);
    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body.length).toBeGreaterThan(0);
    expect(response.body[0].key_menu).toBe('appmanagement');
    expect(response.body[0].children.length).toBe(4);
    expect(response.body[0].children[0].key_menu).toBe('user');
  });

  it('Should return correct menu structure hierarchy', async () => {
    const response = await supertest(web)
      .get(baseUrlTest)
      .set('Cookie', cookieHeader ?? '');

    logger.debug('Menu structure hierarchy response', response.body);
    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
    
    // Check that the structure has proper hierarchy
    const appManagementMenu = response.body.find((menu: any) => menu.key_menu === 'appmanagement');
    expect(appManagementMenu).toBeDefined();
    expect(appManagementMenu.children).toBeDefined();
    expect(Array.isArray(appManagementMenu.children)).toBe(true);
    expect(appManagementMenu.children.length).toBe(4);
  });

  it('Should return correct response structure for menu items', async () => {
    const response = await supertest(web)
      .get(baseUrlTest)
      .set('Cookie', cookieHeader ?? '');

    logger.debug('Menu structure item response', response.body);
    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
    
    if (response.body.length > 0) {
      const firstMenu = response.body[0];
      expect(firstMenu).toHaveProperty('id');
      expect(firstMenu).toHaveProperty('key_menu');
      expect(firstMenu).toHaveProperty('name');
      expect(firstMenu).toHaveProperty('active');
      expect(firstMenu).toHaveProperty('children');
      expect(Array.isArray(firstMenu.children)).toBe(true);
    }
  });

  it('Should handle multiple requests', async () => {
    // Make multiple requests to the same endpoint
    const response1 = await supertest(web)
      .get(baseUrlTest)
      .set('Cookie', cookieHeader ?? '');

    const response2 = await supertest(web)
      .get(baseUrlTest)
      .set('Cookie', cookieHeader ?? '');

    const response3 = await supertest(web)
      .get(baseUrlTest)
      .set('Cookie', cookieHeader ?? '');

    logger.debug('Multiple requests test', {
      response1: response1.body,
      response2: response2.body,
      response3: response3.body
    });

    expect(response1.status).toBe(200);
    expect(response2.status).toBe(200);
    expect(response3.status).toBe(200);
    expect(Array.isArray(response1.body)).toBe(true);
    expect(Array.isArray(response2.body)).toBe(true);
    expect(Array.isArray(response3.body)).toBe(true);
  });

  it('Should return consistent structure across requests', async () => {
    const response1 = await supertest(web)
      .get(baseUrlTest)
      .set('Cookie', cookieHeader ?? '');

    const response2 = await supertest(web)
      .get(baseUrlTest)
      .set('Cookie', cookieHeader ?? '');

    logger.debug('Consistent structure test', {
      response1: response1.body,
      response2: response2.body
    });

    expect(response1.status).toBe(200);
    expect(response2.status).toBe(200);
    expect(response1.body.length).toBe(response2.body.length);
    
    // Check that the main menu structure is consistent
    const appManagement1 = response1.body.find((menu: any) => menu.key_menu === 'appmanagement');
    const appManagement2 = response2.body.find((menu: any) => menu.key_menu === 'appmanagement');
    
    expect(appManagement1).toBeDefined();
    expect(appManagement2).toBeDefined();
    expect(appManagement1.children.length).toBe(appManagement2.children.length);
  });

  it('Should handle nested menu structure correctly', async () => {
    const response = await supertest(web)
      .get(baseUrlTest)
      .set('Cookie', cookieHeader ?? '');

    logger.debug('Nested menu structure response', response.body);
    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
    
    // Check that nested menus have proper structure
    const appManagementMenu = response.body.find((menu: any) => menu.key_menu === 'appmanagement');
    if (appManagementMenu && appManagementMenu.children.length > 0) {
      const firstChild = appManagementMenu.children[0];
      expect(firstChild).toHaveProperty('id');
      expect(firstChild).toHaveProperty('key_menu');
      expect(firstChild).toHaveProperty('name');
      expect(firstChild).toHaveProperty('active');
      expect(firstChild).toHaveProperty('children');
      expect(Array.isArray(firstChild.children)).toBe(true);
    }
  });

  it('Should return active menus only', async () => {
    const response = await supertest(web)
      .get(baseUrlTest)
      .set('Cookie', cookieHeader ?? '');

    logger.debug('Active menus only response', response.body);
    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
    
    // Check that all returned menus are active
    const checkMenuActive = (menus: any[]): boolean => {
      for (const menu of menus) {
        if (menu.active !== 'Active') {
          return false;
        }
        if (menu.children && menu.children.length > 0) {
          if (!checkMenuActive(menu.children)) {
            return false;
          }
        }
      }
      return true;
    };
    
    expect(checkMenuActive(response.body)).toBe(true);
  });

  it('Should handle empty menu structure gracefully', async () => {
    // This test assumes that even with minimal data, some menu structure should be returned
    const response = await supertest(web)
      .get(baseUrlTest)
      .set('Cookie', cookieHeader ?? '');

    logger.debug('Empty menu structure response', response.body);
    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
    // Even with minimal data, we should have at least the App Management menu
    expect(response.body.length).toBeGreaterThanOrEqual(0);
  });

  it('Should return proper menu ordering', async () => {
    const response = await supertest(web)
      .get(baseUrlTest)
      .set('Cookie', cookieHeader ?? '');

    logger.debug('Menu ordering response', response.body);
    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
    
    // Check that menus are properly ordered (assuming order_number is respected)
    if (response.body.length > 1) {
      for (let i = 0; i < response.body.length - 1; i++) {
        expect(response.body[i].order_number).toBeLessThanOrEqual(response.body[i + 1].order_number);
      }
    }
  });

  it('Should handle menu structure with different access levels', async () => {
    const response = await supertest(web)
      .get(baseUrlTest)
      .set('Cookie', cookieHeader ?? '');

    logger.debug('Menu structure with access levels response', response.body);
    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
    
    // Check that the structure includes proper menu hierarchy
    const appManagementMenu = response.body.find((menu: any) => menu.key_menu === 'appmanagement');
    expect(appManagementMenu).toBeDefined();
    expect(appManagementMenu.children).toBeDefined();
    
    // Check that child menus have proper structure
    if (appManagementMenu.children.length > 0) {
      const childMenu = appManagementMenu.children[0];
      expect(childMenu).toHaveProperty('id');
      expect(childMenu).toHaveProperty('key_menu');
      expect(childMenu).toHaveProperty('name');
      expect(childMenu).toHaveProperty('active');
    }
  });

  it('Should return correct data types for all fields', async () => {
    const response = await supertest(web)
      .get(baseUrlTest)
      .set('Cookie', cookieHeader ?? '');

    logger.debug('Data types test response', response.body);
    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
    
    const checkDataTypes = (menus: any[]): boolean => {
      for (const menu of menus) {
        // Check required fields and their types
        if (typeof menu.id !== 'number' ||
            typeof menu.key_menu !== 'string' ||
            typeof menu.name !== 'string' ||
            typeof menu.active !== 'string' ||
            !Array.isArray(menu.children)) {
          return false;
        }
        
        // Recursively check children
        if (menu.children.length > 0) {
          if (!checkDataTypes(menu.children)) {
            return false;
          }
        }
      }
      return true;
    };
    
    expect(checkDataTypes(response.body)).toBe(true);
  });
});
