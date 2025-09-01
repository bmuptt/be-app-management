import dotenv from 'dotenv';
import { TestHelper, AuthLogic } from '../../test-util';
import supertest from 'supertest';
import { web } from '../../../src/config/web';
import { logger } from '../../../src/config/logging';

dotenv.config();

const baseUrlMenuTest = '/api/app-management/menu';
const baseUrlRoleTest = '/api/app-management/role';
const baseUrlRoleMenuTest = '/api/app-management/role-menu';

describe('Get Profile Business Flow', () => {
  beforeEach(async () => {
    // Migrate dan seed ulang database untuk setiap test case
    await TestHelper.refreshDatabase();
  });

  afterEach(async () => {
    // Cleanup database setelah test
    await TestHelper.cleanupDatabase();
  });

  it('Should handle complete profile flow including basic profile retrieval, data structure validation, menu handling, and complex scenarios', async () => {
    // Increase timeout for this comprehensive test
    jest.setTimeout(30000);
    // ===== TEST 1: BASIC PROFILE RETRIEVAL =====
    console.log('🧪 Testing basic profile retrieval...');

    const loginResponse = await AuthLogic.getLoginSuperAdmin();
    expect(loginResponse.status).toBe(200);

    const cookies = loginResponse.headers['set-cookie'];
    const cookieHeader = Array.isArray(cookies) ? cookies.join('; ') : cookies;

    const basicProfileResponse = await supertest(web)
      .get('/api/profile')
      .set('Cookie', cookieHeader);

    expect(basicProfileResponse.status).toBe(200);
    expect(basicProfileResponse.body.profile).toBeDefined();
    expect(basicProfileResponse.body.menu).toBeDefined();
    expect(basicProfileResponse.body.profile.email).toBe(
      process.env.EMAIL_ADMIN,
    );
    expect(basicProfileResponse.body.profile.password).toBeUndefined();

    // ===== TEST 2: PROFILE DATA STRUCTURE =====
    console.log('🧪 Testing profile data structure...');

    expect(basicProfileResponse.body.profile).toHaveProperty('id');
    expect(basicProfileResponse.body.profile).toHaveProperty('email');
    expect(basicProfileResponse.body.profile).toHaveProperty('name');
    expect(basicProfileResponse.body.profile).toHaveProperty('gender');
    expect(basicProfileResponse.body.profile).toHaveProperty('birthdate');
    expect(basicProfileResponse.body.profile).toHaveProperty('role_id');
    expect(basicProfileResponse.body.profile).toHaveProperty('created_at');
    expect(basicProfileResponse.body.profile).toHaveProperty('updated_at');
    expect(basicProfileResponse.body.profile).not.toHaveProperty('password');

    // ===== TEST 3: MENU DATA VALIDATION =====
    console.log('🧪 Testing menu data validation...');

    expect(basicProfileResponse.body.menu).toBeDefined();
    expect(Array.isArray(basicProfileResponse.body.menu)).toBe(true);
    expect(basicProfileResponse.body.menu.length).toBeGreaterThan(0);

    // ===== TEST 4: COMPLEX MENU HIERARCHY =====
    console.log('🧪 Testing complex menu hierarchy...');

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
        list_menu: [{ id: 3 }, { id: 2 }, { id: 4 }, { id: 5 }],
      });

    const complexMenuResponse = await supertest(web)
      .get('/api/profile')
      .set('Cookie', cookieHeader);

    expect(complexMenuResponse.status).toBe(200);
    expect(complexMenuResponse.body.menu[0].children.length).toBe(4);
    expect(complexMenuResponse.body.menu[0].children[0].children.length).toBe(
      1,
    );
    expect(complexMenuResponse.body.menu[0].children[1].children.length).toBe(
      0,
    );

    // ===== TEST 5: DIFFERENT ACCESS LEVELS =====
    console.log('🧪 Testing different access levels...');

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

    const accessLevelResponse = await supertest(web)
      .get('/api/profile')
      .set('Cookie', cookieHeader);

    expect(accessLevelResponse.status).toBe(200);
    expect(accessLevelResponse.body.menu).toBeDefined();

    // ===== TEST 6: CONCURRENT REQUESTS =====
    console.log('🧪 Testing concurrent requests...');

    // Make multiple concurrent requests
    const promises = Array(3)
      .fill(null)
      .map(() =>
        supertest(web).get('/api/profile').set('Cookie', cookieHeader),
      );

    const concurrentResponses = await Promise.all(promises);

    concurrentResponses.forEach((response) => {
      expect(response.status).toBe(200);
      expect(response.body.profile).toBeDefined();
      expect(response.body.menu).toBeDefined();
    });

    // ===== TEST 7: QUERY PARAMETERS =====
    console.log('🧪 Testing query parameters...');

    const queryParamResponse = await supertest(web)
      .get('/api/profile?include=extra&data=test')
      .set('Cookie', cookieHeader);

    expect(queryParamResponse.status).toBe(200);
    expect(queryParamResponse.body.profile).toBeDefined();
    expect(queryParamResponse.body.menu).toBeDefined();

    console.log('✅ All profile flow tests completed successfully');
  });
});
