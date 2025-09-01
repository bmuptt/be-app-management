import dotenv from 'dotenv';
import { TestHelper, AuthLogic } from '../../test-util';
import supertest from 'supertest';
import { web } from '../../../src/config/web';
import { logger } from '../../../src/config/logging';

dotenv.config();

const baseUrlTest = '/api/app-management/role';

describe('Detail Role Business Flow', () => {
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

  it('Should handle complete detail role flow including valid IDs, edge cases, and response structure', async () => {
    // Increase timeout for this comprehensive test
    jest.setTimeout(30000);
    // ===== TEST 1: SUCCESSFUL ROLE DETAIL =====
    console.log('🧪 Testing successful role detail...');

    // First create a role to get its ID
    const createResponse = await supertest(web)
      .post(baseUrlTest)
      .set('Cookie', cookieHeader ?? '')
      .send({
        name: 'Test Role for Detail',
      });

    expect(createResponse.status).toBe(200);
    const roleId = createResponse.body.data.id;

    // Get role detail
    const response = await supertest(web)
      .get(`${baseUrlTest}/${roleId}`)
      .set('Cookie', cookieHeader ?? '');

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('data');
    expect(response.body.data.id).toBe(roleId);
    expect(response.body.data.name).toBe('Test Role for Detail');
    expect(response.body.data).toHaveProperty('created_by');
    expect(response.body.data).toHaveProperty('created_at');
    expect(response.body.data).toHaveProperty('updated_by');
    expect(response.body.data).toHaveProperty('updated_at');

    // ===== TEST 2: NON-EXISTENT ROLE ID =====
    console.log('🧪 Testing non-existent role ID...');

    const nonExistentResponse = await supertest(web)
      .get(`${baseUrlTest}/999999`)
      .set('Cookie', cookieHeader ?? '');

    expect(nonExistentResponse.status).toBe(404);
    expect(nonExistentResponse.body.errors).toContain(
      'The role does not exist!',
    );

    // ===== TEST 3: INVALID ROLE ID FORMAT =====
    console.log('🧪 Testing invalid role ID format...');

    const invalidFormatResponse = await supertest(web)
      .get(`${baseUrlTest}/invalid`)
      .set('Cookie', cookieHeader ?? '');

    expect(invalidFormatResponse.status).toBe(500);
    // Invalid ID format causes database error
    expect(invalidFormatResponse.body.errors).toBeDefined();

    // ===== TEST 4: EDGE CASES =====
    console.log('🧪 Testing edge cases...');

    // Negative role ID
    const negativeResponse = await supertest(web)
      .get(`${baseUrlTest}/-1`)
      .set('Cookie', cookieHeader ?? '');

    expect(negativeResponse.status).toBe(404);
    expect(negativeResponse.body.errors).toContain('The role does not exist!');

    // Zero role ID
    const zeroResponse = await supertest(web)
      .get(`${baseUrlTest}/0`)
      .set('Cookie', cookieHeader ?? '');

    expect(zeroResponse.status).toBe(404);
    expect(zeroResponse.body.errors).toContain('The role does not exist!');

    // Very large role ID
    const largeIdResponse = await supertest(web)
      .get(`${baseUrlTest}/999999999999`)
      .set('Cookie', cookieHeader ?? '');

    expect(largeIdResponse.status).toBe(500);
    // Very large ID causes database integer overflow error
    expect(largeIdResponse.body.errors).toBeDefined();

    // Decimal role ID
    const decimalResponse = await supertest(web)
      .get(`${baseUrlTest}/1.5`)
      .set('Cookie', cookieHeader ?? '');

    expect(decimalResponse.status).toBe(200);
    // parseInt(1.5) returns 1, which finds the Super Admin role
    expect(decimalResponse.body.data.id).toBe(1);

    // ===== TEST 5: MULTIPLE ROLE DETAIL REQUESTS =====
    console.log('🧪 Testing multiple role detail requests...');

    // Create multiple roles
    const roles = ['Role 1', 'Role 2', 'Role 3'];
    const roleIds: number[] = [];

    for (const roleName of roles) {
      const multiCreateResponse = await supertest(web)
        .post(baseUrlTest)
        .set('Cookie', cookieHeader ?? '')
        .send({
          name: roleName,
        });

      expect(multiCreateResponse.status).toBe(200);
      roleIds.push(multiCreateResponse.body.data.id);
    }

    // Get details for all roles
    for (let i = 0; i < roleIds.length; i++) {
      const multiDetailResponse = await supertest(web)
        .get(`${baseUrlTest}/${roleIds[i]}`)
        .set('Cookie', cookieHeader ?? '');

      expect(multiDetailResponse.status).toBe(200);
      expect(multiDetailResponse.body.data.id).toBe(roleIds[i]);
      expect(multiDetailResponse.body.data.name).toBe(roles[i]);
    }

    // ===== TEST 6: RESPONSE STRUCTURE =====
    console.log('🧪 Testing response structure...');

    // Create a role for structure test
    const structureCreateResponse = await supertest(web)
      .post(baseUrlTest)
      .set('Cookie', cookieHeader ?? '')
      .send({
        name: 'Test Role Structure',
      });

    expect(structureCreateResponse.status).toBe(200);
    const structureRoleId = structureCreateResponse.body.data.id;

    // Get role detail for structure test
    const structureResponse = await supertest(web)
      .get(`${baseUrlTest}/${structureRoleId}`)
      .set('Cookie', cookieHeader ?? '');

    expect(structureResponse.status).toBe(200);
    expect(structureResponse.body).toHaveProperty('data');
    expect(structureResponse.body.data).toHaveProperty('id');
    expect(structureResponse.body.data).toHaveProperty('name');
    expect(structureResponse.body.data).toHaveProperty('created_by');
    expect(structureResponse.body.data).toHaveProperty('created_at');
    expect(structureResponse.body.data).toHaveProperty('updated_by');
    expect(structureResponse.body.data).toHaveProperty('updated_at');

    console.log('✅ All detail role flow tests completed successfully');
  });
});
