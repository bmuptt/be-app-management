import dotenv from 'dotenv';
import { TestHelper, AuthLogic } from '../../test-util';
import supertest from 'supertest';
import { web } from '../../../src/config/web';
import { logger } from '../../../src/config/logging';

dotenv.config();

const baseUrlTest = '/api/app-management/role';

describe('List Role Business Flow', () => {
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

  it('Should handle complete list role flow including pagination, search, sorting, and edge cases', async () => {
    // Increase timeout for this comprehensive test
    jest.setTimeout(30000);
    // ===== TEST 1: BASIC LIST ROLES =====
    console.log('🧪 Testing basic list roles...');
    
    const response = await supertest(web)
      .get(baseUrlTest)
      .set('Cookie', cookieHeader ?? '');

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('data');
    expect(response.body).toHaveProperty('total');
    expect(response.body).toHaveProperty('page');
    expect(Array.isArray(response.body.data)).toBe(true);
    expect(response.body.page).toBe(1);
    expect(response.body.total).toBeGreaterThanOrEqual(1); // At least Super Admin role

    // ===== TEST 2: PAGINATION =====
    console.log('🧪 Testing pagination...');
    
    const paginationResponse = await supertest(web)
      .get(`${baseUrlTest}?page=1&limit=5`)
      .set('Cookie', cookieHeader ?? '');

    expect(paginationResponse.status).toBe(200);
    expect(paginationResponse.body.page).toBe(1);
    expect(paginationResponse.body.data.length).toBeLessThanOrEqual(5);

    // ===== TEST 3: SEARCH FUNCTIONALITY =====
    console.log('🧪 Testing search functionality...');
    
    // First create a role with specific name
    const createResponse = await supertest(web)
      .post(baseUrlTest)
      .set('Cookie', cookieHeader ?? '')
      .send({
        name: 'Searchable Role'
      });

    expect(createResponse.status).toBe(200);

    // Search for the role
    const searchResponse = await supertest(web)
      .get(`${baseUrlTest}?search=Searchable`)
      .set('Cookie', cookieHeader ?? '');

    expect(searchResponse.status).toBe(200);
    expect(searchResponse.body.data.length).toBeGreaterThan(0);
    expect(searchResponse.body.data.some((role: any) => role.name.includes('Searchable'))).toBe(true);

    // ===== TEST 4: CASE-INSENSITIVE SEARCH =====
    console.log('🧪 Testing case-insensitive search...');
    
    // Create a role with specific name
    const createCaseResponse = await supertest(web)
      .post(baseUrlTest)
      .set('Cookie', cookieHeader ?? '')
      .send({
        name: 'CaseSensitive Role'
      });

    expect(createCaseResponse.status).toBe(200);

    // Search with different case
    const caseSearchResponse = await supertest(web)
      .get(`${baseUrlTest}?search=casesensitive`)
      .set('Cookie', cookieHeader ?? '');

    expect(caseSearchResponse.status).toBe(200);
    expect(caseSearchResponse.body.data.length).toBeGreaterThan(0);
    expect(caseSearchResponse.body.data.some((role: any) => role.name.includes('CaseSensitive'))).toBe(true);

    // ===== TEST 5: SORTING =====
    console.log('🧪 Testing sorting...');
    
    // Sort by name ascending
    const sortAscResponse = await supertest(web)
      .get(`${baseUrlTest}?order_field=name&order_dir=asc`)
      .set('Cookie', cookieHeader ?? '');

    expect(sortAscResponse.status).toBe(200);
    expect(sortAscResponse.body.data.length).toBeGreaterThan(0);
    
    // Check if data is sorted
    const names = sortAscResponse.body.data.map((role: any) => role.name);
    const sortedNames = [...names].sort();
    expect(names).toEqual(sortedNames);

    // Sort by name descending
    const sortDescResponse = await supertest(web)
      .get(`${baseUrlTest}?order_field=name&order_dir=desc`)
      .set('Cookie', cookieHeader ?? '');

    expect(sortDescResponse.status).toBe(200);
    expect(sortDescResponse.body.data.length).toBeGreaterThan(0);
    
    // Check if data is sorted
    const descNames = sortDescResponse.body.data.map((role: any) => role.name);
    const sortedDescNames = [...descNames].sort().reverse();
    expect(descNames).toEqual(sortedDescNames);

    // Default sort by id descending
    const defaultSortResponse = await supertest(web)
      .get(baseUrlTest)
      .set('Cookie', cookieHeader ?? '');

    expect(defaultSortResponse.status).toBe(200);
    expect(defaultSortResponse.body.data.length).toBeGreaterThan(0);
    
    // Check if data is sorted by id descending
    const ids = defaultSortResponse.body.data.map((role: any) => role.id);
    const sortedIds = [...ids].sort((a, b) => b - a);
    expect(ids).toEqual(sortedIds);

    // ===== TEST 6: EDGE CASES =====
    console.log('🧪 Testing edge cases...');
    
    // Empty search results
    const emptySearchResponse = await supertest(web)
      .get(`${baseUrlTest}?search=NonExistentRoleName`)
      .set('Cookie', cookieHeader ?? '');

    expect(emptySearchResponse.status).toBe(200);
    expect(emptySearchResponse.body.data.length).toBe(0);
    expect(emptySearchResponse.body.total).toBe(0);

    // Very large page numbers
    const largePageResponse = await supertest(web)
      .get(`${baseUrlTest}?page=999999`)
      .set('Cookie', cookieHeader ?? '');

    expect(largePageResponse.status).toBe(200);
    expect(largePageResponse.body.data.length).toBe(0); // Should be empty for non-existent page
    expect(largePageResponse.body.page).toBe(999999);

    // Large limit values
    const largeLimitResponse = await supertest(web)
      .get(`${baseUrlTest}?limit=1000`)
      .set('Cookie', cookieHeader ?? '');

    expect(largeLimitResponse.status).toBe(200);
    expect(largeLimitResponse.body.data.length).toBeLessThanOrEqual(1000);

    // ===== TEST 7: SPECIAL CHARACTERS =====
    console.log('🧪 Testing special characters...');
    
    // Create a role with special characters
    const specialCharResponse = await supertest(web)
      .post(baseUrlTest)
      .set('Cookie', cookieHeader ?? '')
      .send({
        name: 'Role with @#$%^&*()'
      });

    expect(specialCharResponse.status).toBe(200);

    // Search for the role with special characters
    const specialSearchResponse = await supertest(web)
      .get(`${baseUrlTest}?search=@#$%^&*()`)
      .set('Cookie', cookieHeader ?? '');

    expect(specialSearchResponse.status).toBe(200);
    expect(specialSearchResponse.body.data.length).toBeGreaterThan(0);

    // Unicode characters
    const unicodeResponse = await supertest(web)
      .post(baseUrlTest)
      .set('Cookie', cookieHeader ?? '')
      .send({
        name: 'Rôle avec caractères spéciaux 角色'
      });

    expect(unicodeResponse.status).toBe(200);

    // Search for Unicode characters
    const unicodeSearchResponse = await supertest(web)
      .get(`${baseUrlTest}?search=角色`)
      .set('Cookie', cookieHeader ?? '');

    expect(unicodeSearchResponse.status).toBe(200);
    expect(unicodeSearchResponse.body.data.length).toBeGreaterThan(0);

    // ===== TEST 8: MULTIPLE QUERY PARAMETERS =====
    console.log('🧪 Testing multiple query parameters...');
    
    const multipleParamsResponse = await supertest(web)
      .get(`${baseUrlTest}?page=1&limit=10&search=Admin&order_field=name&order_dir=asc`)
      .set('Cookie', cookieHeader ?? '');

    expect(multipleParamsResponse.status).toBe(200);
    expect(multipleParamsResponse.body.page).toBe(1);
    expect(multipleParamsResponse.body.data.length).toBeLessThanOrEqual(10);

    // ===== TEST 9: RESPONSE STRUCTURE =====
    console.log('🧪 Testing response structure...');
    
    const structureResponse = await supertest(web)
      .get(baseUrlTest)
      .set('Cookie', cookieHeader ?? '');

    expect(structureResponse.status).toBe(200);
    expect(structureResponse.body).toHaveProperty('data');
    expect(structureResponse.body).toHaveProperty('total');
    expect(structureResponse.body).toHaveProperty('page');
    expect(Array.isArray(structureResponse.body.data)).toBe(true);
    
    if (structureResponse.body.data.length > 0) {
      const role = structureResponse.body.data[0];
      expect(role).toHaveProperty('id');
      expect(role).toHaveProperty('name');
      expect(role).toHaveProperty('created_by');
      expect(role).toHaveProperty('created_at');
      expect(role).toHaveProperty('updated_by');
      expect(role).toHaveProperty('updated_at');
    }

    console.log('✅ All list role flow tests completed successfully');
  });
});
