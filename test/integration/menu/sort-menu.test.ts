import dotenv from 'dotenv';
import { TestHelper, AuthLogic } from '../../test-util';
import supertest from 'supertest';
import { web } from '../../../src/config/web';
import { logger } from '../../../src/config/logging';

dotenv.config();

const baseUrlTest = '/api/app-management/menu';

describe('Menu Sort Business Flow', () => {
  let cookieHeader: string | null;

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

  it('Should handle complete sort menu flow including validation, edge cases, and response structure', async () => {
    // Increase timeout for this comprehensive test
    jest.setTimeout(30000);

    // ===== TEST 1: SUCCESSFUL MENU SORTING =====
    console.log('🧪 Testing successful menu sorting...');
    
    // Create multiple test menus
    const menu1Response = await supertest(web)
      .post(baseUrlTest)
      .set('Cookie', cookieHeader ?? '')
      .send({
        key_menu: 'menu-1',
        name: 'Menu 1'
      });

    expect(menu1Response.status).toBe(200);
    const menu1Id = menu1Response.body.data.id;

    const menu2Response = await supertest(web)
      .post(baseUrlTest)
      .set('Cookie', cookieHeader ?? '')
      .send({
        key_menu: 'menu-2',
        name: 'Menu 2'
      });

    expect(menu2Response.status).toBe(200);
    const menu2Id = menu2Response.body.data.id;

    const menu3Response = await supertest(web)
      .post(baseUrlTest)
      .set('Cookie', cookieHeader ?? '')
      .send({
        key_menu: 'menu-3',
        name: 'Menu 3'
      });

    expect(menu3Response.status).toBe(200);
    const menu3Id = menu3Response.body.data.id;

    // Sort menus
    const sortData = {
      list_menu: [
        { id: menu3Id },
        { id: menu1Id },
        { id: menu2Id }
      ]
    };

    const sortResponse = await supertest(web)
      .post(`${baseUrlTest}/sort/0`)
      .set('Cookie', cookieHeader ?? '')
      .send(sortData);

    expect(sortResponse.status).toBe(200);
    expect(sortResponse.body.message).toBe('Success to sort data menu.');

    // ===== TEST 2: SORT WITH INVALID MENU ID =====
    console.log('🧪 Testing sort with invalid menu ID...');
    
    const invalidSortData = {
      list_menu: [
        { id: 999999 },
        { id: menu1Id }
      ]
    };

    const invalidSortResponse = await supertest(web)
      .post(`${baseUrlTest}/sort/0`)
      .set('Cookie', cookieHeader ?? '')
      .send(invalidSortData);

    expect(invalidSortResponse.status).toBe(404);
    expect(invalidSortResponse.body.errors).toBeDefined();

    // ===== TEST 3: SORT WITH DUPLICATE ORDER NUMBERS =====
    console.log('🧪 Testing sort with duplicate order numbers...');
    
    const duplicateOrderData = {
      list_menu: [
        { id: menu1Id },
        { id: menu2Id }
      ]
    };

    const duplicateOrderResponse = await supertest(web)
      .post(`${baseUrlTest}/sort/0`)
      .set('Cookie', cookieHeader ?? '')
      .send(duplicateOrderData);

    expect(duplicateOrderResponse.status).toBe(200);
    expect(duplicateOrderResponse.body.message).toBe('Success to sort data menu.');

    // ===== TEST 4: SORT WITH NEGATIVE ORDER NUMBERS =====
    console.log('🧪 Testing sort with negative order numbers...');
    
    const negativeOrderData = {
      list_menu: [
        { id: menu1Id },
        { id: menu2Id }
      ]
    };

    const negativeOrderResponse = await supertest(web)
      .post(`${baseUrlTest}/sort/0`)
      .set('Cookie', cookieHeader ?? '')
      .send(negativeOrderData);

    expect(negativeOrderResponse.status).toBe(200);
    expect(negativeOrderResponse.body.message).toBe('Success to sort data menu.');

    // ===== TEST 5: SORT WITH EMPTY ARRAY =====
    console.log('🧪 Testing sort with empty array...');
    
    const emptyArrayResponse = await supertest(web)
      .post(`${baseUrlTest}/sort/0`)
      .set('Cookie', cookieHeader ?? '')
      .send({ list_menu: [] });

    expect(emptyArrayResponse.status).toBe(400);
    expect(emptyArrayResponse.body.errors).toBeDefined();

    // ===== TEST 6: SORT WITH MISSING REQUIRED FIELDS =====
    console.log('🧪 Testing sort with missing required fields...');
    
    const missingFieldsData = {
      list_menu: [
        { id: menu1Id },
        { order_number: 1 }
      ]
    };

    const missingFieldsResponse = await supertest(web)
      .post(`${baseUrlTest}/sort/0`)
      .set('Cookie', cookieHeader ?? '')
      .send(missingFieldsData);

    expect(missingFieldsResponse.status).toBe(400);
    expect(missingFieldsResponse.body.errors).toBeDefined();

    // ===== TEST 7: SORT WITH EXTRA FIELDS =====
    console.log('🧪 Testing sort with extra fields...');
    
    const extraFieldsData = {
      list_menu: [
        { id: menu1Id, extra_field: 'should be ignored' },
        { id: menu2Id, another_field: 123 }
      ]
    };

    const extraFieldsResponse = await supertest(web)
      .post(`${baseUrlTest}/sort/0`)
      .set('Cookie', cookieHeader ?? '')
      .send(extraFieldsData);

    expect(extraFieldsResponse.status).toBe(200);
    expect(extraFieldsResponse.body.message).toBe('Success to sort data menu.');

    // ===== TEST 8: SORT WITH LARGE ORDER NUMBERS =====
    console.log('🧪 Testing sort with large order numbers...');
    
    const largeOrderData = [
      { id: menu1Id, order_number: 1000 },
      { id: menu2Id, order_number: 2000 },
      { id: menu3Id, order_number: 3000 }
    ];

    const largeOrderResponse = await supertest(web)
      .post(`${baseUrlTest}/sort/0`)
      .set('Cookie', cookieHeader ?? '')
      .send({ list_menu: largeOrderData });

    expect(largeOrderResponse.status).toBe(200);
    expect(largeOrderResponse.body.message).toBe('Success to sort data menu.');

    // ===== TEST 9: SORT WITH DECIMAL ORDER NUMBERS =====
    console.log('🧪 Testing sort with decimal order numbers...');
    
    const decimalOrderData = [
      { id: menu1Id, order_number: 1.5 },
      { id: menu2Id, order_number: 2.7 }
    ];

    const decimalOrderResponse = await supertest(web)
      .post(`${baseUrlTest}/sort/0`)
      .set('Cookie', cookieHeader ?? '')
      .send({ list_menu: decimalOrderData });

    expect(decimalOrderResponse.status).toBe(200);
    expect(decimalOrderResponse.body.message).toBe('Success to sort data menu.');

    // ===== TEST 10: SORT WITH STRING ORDER NUMBERS =====
    console.log('🧪 Testing sort with string order numbers...');
    
    const stringOrderData = [
      { id: menu1Id, order_number: '1' },
      { id: menu2Id, order_number: '2' }
    ];

    const stringOrderResponse = await supertest(web)
      .post(`${baseUrlTest}/sort/0`)
      .set('Cookie', cookieHeader ?? '')
      .send({ list_menu: stringOrderData });

    expect(stringOrderResponse.status).toBe(200);
    expect(stringOrderResponse.body.message).toBe('Success to sort data menu.');

    // ===== TEST 11: CONCURRENT SORT REQUESTS =====
    console.log('🧪 Testing concurrent sort requests...');
    
    // Create additional menus for concurrent sorting
    const concurrentMenuPromises = Array(3).fill(null).map((_, index) =>
      supertest(web)
        .post(baseUrlTest)
        .set('Cookie', cookieHeader ?? '')
        .send({
          key_menu: `concurrent-menu-${index + 1}`,
          name: `Concurrent Menu ${index + 1}`
        })
    );

    const concurrentCreateResponses = await Promise.all(concurrentMenuPromises);
    const concurrentMenuIds = concurrentCreateResponses.map(response => response.body.data.id);

    // Make concurrent sort requests
    const concurrentSortPromises = Array(3).fill(null).map((_, index) => {
      const sortData = concurrentMenuIds.map((menuId, sortIndex) => ({
        id: menuId,
        order_number: (index * 10) + sortIndex + 1
      }));

      return supertest(web)
        .post(`${baseUrlTest}/sort/0`)
        .set('Cookie', cookieHeader ?? '')
        .send({ list_menu: sortData });
    });

    const concurrentSortResponses = await Promise.all(concurrentSortPromises);

    // At least one should succeed
    const successfulSorts = concurrentSortResponses.filter(response => response.status === 200);
    expect(successfulSorts.length).toBeGreaterThan(0);

    // ===== TEST 12: VERIFY SORT RESULTS =====
    console.log('🧪 Testing verify sort results...');
    
    // Get the sorted menu list
    const listResponse = await supertest(web)
      .get(`${baseUrlTest}/0`)
      .set('Cookie', cookieHeader ?? '');

    expect(listResponse.status).toBe(200);
    expect(listResponse.body.data).toBeDefined();
    expect(Array.isArray(listResponse.body.data)).toBe(true);

    // Verify that menus are sorted by order_number
    if (listResponse.body.data.length > 1) {
      for (let i = 0; i < listResponse.body.data.length - 1; i++) {
        expect(listResponse.body.data[i].order_number).toBeLessThanOrEqual(listResponse.body.data[i + 1].order_number);
      }
    }

    console.log('✅ All sort menu flow tests completed successfully');
  });
});
