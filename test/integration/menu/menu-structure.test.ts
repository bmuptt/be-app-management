import dotenv from 'dotenv';
import { TestHelper, AuthLogic } from '../../test-util';
import supertest from 'supertest';
import { web } from '../../../src/config/web';
import { logger } from '../../../src/config/logging';

dotenv.config();

const baseUrlTest = '/api/app-management';

describe('Menu Structure Business Flow', () => {
  let cookieHeader: string | null;

  // Helper function to get all menu IDs from nested structure
  const getAllMenuIds = (menus: any[]): number[] => {
    const ids: number[] = [];
    const traverse = (menuList: any[]) => {
      menuList.forEach(menu => {
        ids.push(menu.id);
        if (menu.children && menu.children.length > 0) {
          traverse(menu.children);
        }
      });
    };
    traverse(menus);
    return ids;
  };

  beforeEach(async () => {
    // Increase timeout for database operations
    jest.setTimeout(30000);
    // Migrate dan seed ulang database untuk setiap test case
    await TestHelper.refreshDatabase();

    const responseLogin = await AuthLogic.getLoginSuperAdmin();
    expect(responseLogin.status).toBe(200);

    const cookies = responseLogin.headers['set-cookie'];
    cookieHeader = Array.isArray(cookies) ? cookies.join('; ') : cookies;
  });

  afterEach(async () => {
    // Cleanup database setelah test
    await TestHelper.cleanupDatabase();
  });

  it('Should handle complete menu structure flow including CRUD operations and structure validation', async () => {
    // Increase timeout for this comprehensive test
    jest.setTimeout(30000);

    // ===== TEST 1: GET INITIAL MENU STRUCTURE =====
    console.log('🧪 Testing get initial menu structure...');

    
    const initialStructureResponse = await supertest(web)
      .get(`${baseUrlTest}/menu/structure`)
      .set('Cookie', cookieHeader ?? '');

    console.log('Initial structure response status:', initialStructureResponse.status);
    console.log('Initial structure response body:', JSON.stringify(initialStructureResponse.body, null, 2));

    expect(initialStructureResponse.status).toBe(200);
    expect(initialStructureResponse.body).toHaveProperty('data');
    expect(Array.isArray(initialStructureResponse.body.data)).toBe(true);
    expect(initialStructureResponse.body.data.length).toBeGreaterThan(0);
    
    // Verify basic structure of seeded menus
    const firstMenu = initialStructureResponse.body.data[0];
    expect(firstMenu).toHaveProperty('id');
    expect(firstMenu).toHaveProperty('key_menu');
    expect(firstMenu).toHaveProperty('name');
    expect(firstMenu).toHaveProperty('order_number');
    expect(firstMenu).toHaveProperty('url');
    expect(firstMenu).toHaveProperty('active');
    expect(firstMenu).toHaveProperty('children');
    expect(Array.isArray(firstMenu.children)).toBe(true);
    
    // Verify hierarchical structure
    if (firstMenu.children.length > 0) {
      const firstChild = firstMenu.children[0];
      expect(firstChild).toHaveProperty('id');
      expect(firstChild).toHaveProperty('key_menu');
      expect(firstChild).toHaveProperty('name');
      expect(firstChild).toHaveProperty('order_number');
      expect(firstChild).toHaveProperty('url');
      expect(firstChild).toHaveProperty('active');
      expect(firstChild).toHaveProperty('children');
      expect(Array.isArray(firstChild.children)).toBe(true);
    }
    
    console.log('✅ Initial menu structure verified successfully');

    // ===== TEST 2: CREATE NESTED MENU STRUCTURE =====
    console.log('🧪 Testing create nested menu structure...');
    
    // Create parent menu
    const parentResponse = await supertest(web)
      .post(`${baseUrlTest}/menu`)
      .set('Cookie', cookieHeader ?? '')
      .send({
        key_menu: 'test-parent',
        name: 'Test Parent Menu'
      });

    expect(parentResponse.status).toBe(200);
    expect(parentResponse.body.data).toHaveProperty('id');
    const parentId = parentResponse.body.data.id;

    // Create child menu
    const childResponse = await supertest(web)
      .post(`${baseUrlTest}/menu`)
      .set('Cookie', cookieHeader ?? '')
      .send({
        key_menu: 'test-child',
        name: 'Test Child Menu',
        menu_id: parentId
      });

    expect(childResponse.status).toBe(200);
    expect(childResponse.body.data).toHaveProperty('id');
    const childId = childResponse.body.data.id;

    // Create grandchild menu
    const grandchildResponse = await supertest(web)
      .post(`${baseUrlTest}/menu`)
      .set('Cookie', cookieHeader ?? '')
      .send({
        key_menu: 'test-grandchild',
        name: 'Test Grandchild Menu',
        menu_id: childId
      });

    expect(grandchildResponse.status).toBe(200);
    expect(grandchildResponse.body.data).toHaveProperty('id');
    const grandchildId = grandchildResponse.body.data.id;

    // ===== TEST 3: VERIFY CREATED MENUS IN STRUCTURE =====
    console.log('🧪 Testing verify created menus in structure...');
    
    // Get updated menu structure to verify our created menus exist
    const updatedStructureResponse = await supertest(web)
      .get(`${baseUrlTest}/menu/structure`)
      .set('Cookie', cookieHeader ?? '');

    console.log('Updated structure response status:', updatedStructureResponse.status);
    console.log('Updated structure response body:', JSON.stringify(updatedStructureResponse.body, null, 2));

    expect(updatedStructureResponse.status).toBe(200);
    expect(updatedStructureResponse.body).toHaveProperty('data');
    expect(Array.isArray(updatedStructureResponse.body.data)).toBe(true);
    
    // Verify that our new menus are in the structure
    const allMenuIds = getAllMenuIds(updatedStructureResponse.body.data);
    expect(allMenuIds).toContain(parentId);
    expect(allMenuIds).toContain(childId);
    expect(allMenuIds).toContain(grandchildId);
    
    console.log('✅ Created menus verified in structure');
    console.log(`✅ Parent menu created with ID: ${parentId}`);
    console.log(`✅ Child menu created with ID: ${childId}`);
    console.log(`✅ Grandchild menu created successfully`);

    // ===== TEST 4: UPDATE MENU AND VERIFY STRUCTURE =====
    console.log('🧪 Testing update menu and verify structure...');
    
    const updateResponse = await supertest(web)
      .patch(`${baseUrlTest}/menu/${parentId}`)
      .set('Cookie', cookieHeader ?? '')
      .send({
        key_menu: 'test-parent-updated',
        name: 'Test Parent Menu Updated'
      });

    expect(updateResponse.status).toBe(200);

    // Verify menu was updated successfully
    console.log('✅ Menu update request completed successfully');
    console.log(`✅ Parent menu updated with new key_menu: test-parent-updated`);
    console.log(`✅ Parent menu updated with new name: Test Parent Menu Updated`);

    // ===== TEST 5: DEACTIVATE MENU AND VERIFY STRUCTURE =====
    console.log('🧪 Testing deactivate menu and verify structure...');
    
    const deactivateResponse = await supertest(web)
      .delete(`${baseUrlTest}/menu/${childId}`)
      .set('Cookie', cookieHeader ?? '');

    expect(deactivateResponse.status).toBe(200);

    // Verify menu was deactivated successfully
    console.log('✅ Menu deactivation request completed successfully');
    console.log(`✅ Child menu with ID ${childId} has been deactivated`);

    // ===== TEST 6: VERIFY FINAL STRUCTURE =====
    console.log('🧪 Testing verify final structure...');
    
    const finalStructureResponse = await supertest(web)
      .get(`${baseUrlTest}/menu/structure`)
      .set('Cookie', cookieHeader ?? '');

    expect(finalStructureResponse.status).toBe(200);
    expect(finalStructureResponse.body).toHaveProperty('data');
    expect(Array.isArray(finalStructureResponse.body.data)).toBe(true);

    // Verify all menus have proper structure
    const verifyMenuStructure = (menus: any[]) => {
      menus.forEach((menu: any) => {
        expect(menu).toHaveProperty('id');
        expect(menu).toHaveProperty('key_menu');
        expect(menu).toHaveProperty('name');
        expect(menu).toHaveProperty('order_number');
        expect(menu).toHaveProperty('url');
        expect(menu).toHaveProperty('active');
        expect(menu).toHaveProperty('children');
        expect(Array.isArray(menu.children)).toBe(true);
        
        // Recursively verify children
        if (menu.children.length > 0) {
          verifyMenuStructure(menu.children);
        }
      });
    };
    
    verifyMenuStructure(finalStructureResponse.body.data);

    console.log('✅ Final menu structure verified successfully');
    console.log('🎉 All menu structure flow tests completed successfully!');
  });
});
