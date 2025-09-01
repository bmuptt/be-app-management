import dotenv from 'dotenv';
import { TestHelper, AuthLogic } from '../../test-util';
import supertest from 'supertest';
import { web } from '../../../src/config/web';
import { logger } from '../../../src/config/logging';

dotenv.config();

const baseUrlTest = '/api/app-management/user';

describe('List User Business Flow', () => {
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

  it('Should handle complete list user flow including pagination, search, sorting, and data structure validation', async () => {
    // Increase timeout for this comprehensive test
    jest.setTimeout(30000);

    // ===== TEST 1: DEFAULT PAGINATION =====
    console.log('🧪 Testing default pagination...');

    const defaultResponse = await supertest(web)
      .get(baseUrlTest)
      .set('Cookie', cookieHeader ?? '');

    expect(defaultResponse.status).toBe(200);
    expect(defaultResponse.body.data).toBeDefined();
    expect(Array.isArray(defaultResponse.body.data)).toBe(true);
    expect(defaultResponse.body.total).toBeDefined();
    expect(typeof defaultResponse.body.total).toBe('number');
    expect(defaultResponse.body.page).toBe(1);

    // ===== TEST 2: CUSTOM PAGINATION =====
    console.log('🧪 Testing custom pagination...');

    const customPaginationResponse = await supertest(web)
      .get(baseUrlTest)
      .query({
        page: 2,
        per_page: 5,
      })
      .set('Cookie', cookieHeader ?? '');

    expect(customPaginationResponse.status).toBe(200);
    expect(customPaginationResponse.body.data).toBeDefined();
    expect(Array.isArray(customPaginationResponse.body.data)).toBe(true);
    expect(customPaginationResponse.body.page).toBe(2);

    // ===== TEST 3: SEARCH BY NAME =====
    console.log('🧪 Testing search by name...');

    const searchByNameResponse = await supertest(web)
      .get(baseUrlTest)
      .query({
        search: 'Admin',
      })
      .set('Cookie', cookieHeader ?? '');

    expect(searchByNameResponse.status).toBe(200);
    expect(searchByNameResponse.body.data).toBeDefined();
    expect(Array.isArray(searchByNameResponse.body.data)).toBe(true);

    // Check if returned users contain 'Admin' in their name
    searchByNameResponse.body.data.forEach((user: any) => {
      expect(user.name.toLowerCase()).toContain('admin');
    });

    // ===== TEST 4: SEARCH BY EMAIL =====
    console.log('🧪 Testing search by email...');

    const searchByEmailResponse = await supertest(web)
      .get(baseUrlTest)
      .query({
        search: 'admin@arzhi.com',
      })
      .set('Cookie', cookieHeader ?? '');

    expect(searchByEmailResponse.status).toBe(200);
    expect(searchByEmailResponse.body.data).toBeDefined();
    expect(Array.isArray(searchByEmailResponse.body.data)).toBe(true);

    // Check if returned users contain the email
    searchByEmailResponse.body.data.forEach((user: any) => {
      expect(user.email.toLowerCase()).toContain('admin@arzhi.com');
    });

    // ===== TEST 5: SORTING BY NAME ASC =====
    console.log('🧪 Testing sorting by name ascending...');

    const sortByNameAscResponse = await supertest(web)
      .get(baseUrlTest)
      .query({
        order_field: 'name',
        order_dir: 'asc',
      })
      .set('Cookie', cookieHeader ?? '');

    expect(sortByNameAscResponse.status).toBe(200);
    expect(sortByNameAscResponse.body.data).toBeDefined();
    expect(Array.isArray(sortByNameAscResponse.body.data)).toBe(true);

    // Check if users are sorted by name in ascending order
    const names = sortByNameAscResponse.body.data.map((user: any) => user.name);
    const sortedNames = [...names].sort();
    expect(names).toEqual(sortedNames);

    // ===== TEST 6: SORTING BY NAME DESC =====
    console.log('🧪 Testing sorting by name descending...');

    const sortByNameDescResponse = await supertest(web)
      .get(baseUrlTest)
      .query({
        order_field: 'name',
        order_dir: 'desc',
      })
      .set('Cookie', cookieHeader ?? '');

    expect(sortByNameDescResponse.status).toBe(200);
    expect(sortByNameDescResponse.body.data).toBeDefined();
    expect(Array.isArray(sortByNameDescResponse.body.data)).toBe(true);

    // Check if users are sorted by name in descending order
    const namesDesc = sortByNameDescResponse.body.data.map(
      (user: any) => user.name,
    );
    const sortedNamesDesc = [...namesDesc].sort().reverse();
    expect(namesDesc).toEqual(sortedNamesDesc);

    // ===== TEST 7: SORTING BY EMAIL ASC =====
    console.log('🧪 Testing sorting by email ascending...');

    const sortByEmailAscResponse = await supertest(web)
      .get(baseUrlTest)
      .query({
        order_field: 'email',
        order_dir: 'asc',
      })
      .set('Cookie', cookieHeader ?? '');

    expect(sortByEmailAscResponse.status).toBe(200);
    expect(sortByEmailAscResponse.body.data).toBeDefined();
    expect(Array.isArray(sortByEmailAscResponse.body.data)).toBe(true);

    // Check if users are sorted by email in ascending order
    const emails = sortByEmailAscResponse.body.data.map(
      (user: any) => user.email,
    );
    const sortedEmails = [...emails].sort();
    expect(emails).toEqual(sortedEmails);

    // ===== TEST 8: SORTING BY EMAIL DESC =====
    console.log('🧪 Testing sorting by email descending...');

    const sortByEmailDescResponse = await supertest(web)
      .get(baseUrlTest)
      .query({
        order_field: 'email',
        order_dir: 'desc',
      })
      .set('Cookie', cookieHeader ?? '');

    expect(sortByEmailDescResponse.status).toBe(200);
    expect(sortByEmailDescResponse.body.data).toBeDefined();
    expect(Array.isArray(sortByEmailDescResponse.body.data)).toBe(true);

    // Check if users are sorted by email in descending order
    const emailsDesc = sortByEmailDescResponse.body.data.map(
      (user: any) => user.email,
    );
    const sortedEmailsDesc = [...emailsDesc].sort().reverse();
    expect(emailsDesc).toEqual(sortedEmailsDesc);

    // ===== TEST 9: COMBINED SEARCH AND SORTING =====
    console.log('🧪 Testing combined search and sorting...');

    const combinedResponse = await supertest(web)
      .get(baseUrlTest)
      .query({
        search: 'admin',
        order_field: 'name',
        order_dir: 'asc',
        page: 1,
        per_page: 10,
      })
      .set('Cookie', cookieHeader ?? '');

    expect(combinedResponse.status).toBe(200);
    expect(combinedResponse.body.data).toBeDefined();
    expect(Array.isArray(combinedResponse.body.data)).toBe(true);

    // Check if returned users contain 'admin' and are sorted
    combinedResponse.body.data.forEach((user: any) => {
      expect(user.name.toLowerCase()).toContain('admin');
    });

    const combinedNames = combinedResponse.body.data.map(
      (user: any) => user.name,
    );
    const sortedCombinedNames = [...combinedNames].sort();
    expect(combinedNames).toEqual(sortedCombinedNames);

    // ===== TEST 10: EMPTY SEARCH RESULTS =====
    console.log('🧪 Testing empty search results...');

    const emptySearchResponse = await supertest(web)
      .get(baseUrlTest)
      .query({
        search: 'nonexistentuser12345',
      })
      .set('Cookie', cookieHeader ?? '');

    expect(emptySearchResponse.status).toBe(200);
    expect(emptySearchResponse.body.data).toBeDefined();
    expect(Array.isArray(emptySearchResponse.body.data)).toBe(true);
    expect(emptySearchResponse.body.data.length).toBe(0);
    expect(emptySearchResponse.body.total).toBe(0);

    // ===== TEST 11: CASE-INSENSITIVE SEARCH =====
    console.log('🧪 Testing case-insensitive search...');

    const caseInsensitiveResponse = await supertest(web)
      .get(baseUrlTest)
      .query({
        search: 'ADMIN',
      })
      .set('Cookie', cookieHeader ?? '');

    expect(caseInsensitiveResponse.status).toBe(200);
    expect(caseInsensitiveResponse.body.data).toBeDefined();
    expect(Array.isArray(caseInsensitiveResponse.body.data)).toBe(true);

    // Should find users with 'admin' regardless of case
    expect(caseInsensitiveResponse.body.data.length).toBeGreaterThan(0);

    // ===== TEST 12: LARGE PAGE NUMBERS =====
    console.log('🧪 Testing large page numbers...');

    const largePageResponse = await supertest(web)
      .get(baseUrlTest)
      .query({
        page: 999,
        per_page: 10,
      })
      .set('Cookie', cookieHeader ?? '');

    expect(largePageResponse.status).toBe(200);
    expect(largePageResponse.body.data).toBeDefined();
    expect(Array.isArray(largePageResponse.body.data)).toBe(true);
    expect(largePageResponse.body.page).toBe(999);
    // Should return empty array for non-existent page
    expect(largePageResponse.body.data.length).toBe(0);

    // ===== TEST 13: DIFFERENT PER_PAGE VALUES =====
    console.log('🧪 Testing different per_page values...');

    const testCases = [1, 5, 10, 20, 50];

    for (const perPage of testCases) {
      const perPageResponse = await supertest(web)
        .get(baseUrlTest)
        .query({
          per_page: perPage,
        })
        .set('Cookie', cookieHeader ?? '');

      expect(perPageResponse.status).toBe(200);
      expect(perPageResponse.body.data).toBeDefined();
      expect(Array.isArray(perPageResponse.body.data)).toBe(true);
      expect(perPageResponse.body.data.length).toBeLessThanOrEqual(perPage);
    }

    // ===== TEST 14: USER DATA STRUCTURE =====
    console.log('🧪 Testing user data structure...');

    const structureResponse = await supertest(web)
      .get(baseUrlTest)
      .set('Cookie', cookieHeader ?? '');

    expect(structureResponse.status).toBe(200);
    expect(structureResponse.body.data).toBeDefined();
    expect(Array.isArray(structureResponse.body.data)).toBe(true);

    if (structureResponse.body.data.length > 0) {
      const user = structureResponse.body.data[0];
      expect(user).toHaveProperty('id');
      expect(user).toHaveProperty('email');
      expect(user).toHaveProperty('name');
      expect(user).toHaveProperty('gender');
      expect(user).toHaveProperty('birthdate');
      expect(user).toHaveProperty('active');
      expect(user).toHaveProperty('role_id');
      expect(user).toHaveProperty('created_at');
      expect(user).toHaveProperty('updated_at');
      expect(user).toHaveProperty('created_by');
      expect(user).toHaveProperty('updated_by');
      expect(user).toHaveProperty('photo');
    }

    // ===== TEST 15: MULTIPLE USERS WITH DIFFERENT DATA =====
    console.log('🧪 Testing multiple users with different data...');

    // First, create some additional users
    const additionalUsers = [
      {
        email: 'user1@example.com',
        name: 'User One',
        gender: 'Male',
        birthdate: '1990-01-01',
        role_id: 1,
      },
      {
        email: 'user2@example.com',
        name: 'User Two',
        gender: 'Female',
        birthdate: '1995-05-15',
        role_id: 1,
      },
      {
        email: 'user3@example.com',
        name: 'User Three',
        gender: 'Male',
        birthdate: '1988-12-25',
        role_id: 1,
      },
    ];

    // Create the additional users
    for (const userData of additionalUsers) {
      const createResponse = await supertest(web)
        .post(baseUrlTest)
        .set('Cookie', cookieHeader ?? '')
        .send(userData);

      expect(createResponse.status).toBe(200);
    }

    // Now test listing all users
    const multipleUsersResponse = await supertest(web)
      .get(baseUrlTest)
      .set('Cookie', cookieHeader ?? '');

    expect(multipleUsersResponse.status).toBe(200);
    expect(multipleUsersResponse.body.data).toBeDefined();
    expect(Array.isArray(multipleUsersResponse.body.data)).toBe(true);
    expect(multipleUsersResponse.body.total).toBeGreaterThanOrEqual(4); // Admin + 3 additional users

    // Check if all created users are in the list
    const userEmails = multipleUsersResponse.body.data.map(
      (user: any) => user.email,
    );
    additionalUsers.forEach((user) => {
      expect(userEmails).toContain(user.email);
    });

    console.log('✅ All list user flow tests completed successfully');
  });
});
