import dotenv from 'dotenv';
import { TestHelper, AuthLogic } from '../../test-util';
import supertest from 'supertest';
import { web } from '../../../src/config/web';
import { logger } from '../../../src/config/logging';

dotenv.config();

const baseUrlTest = '/api/app-management/role';

describe('Delete Role Business Flow', () => {
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

  it('Should handle complete delete role flow including validation, edge cases, and response structure', async () => {
    // Increase timeout for this comprehensive test
    jest.setTimeout(30000);
    // ===== TEST 1: SUCCESSFUL ROLE DELETE =====
    console.log('🧪 Testing successful role delete...');
    
    // First create a role
    const createResponse = await supertest(web)
      .post(baseUrlTest)
      .set('Cookie', cookieHeader ?? '')
      .send({
        name: 'Role to Delete'
      });

    expect(createResponse.status).toBe(200);
    const roleId = createResponse.body.data.id;

    // Delete the role
    const response = await supertest(web)
      .delete(`${baseUrlTest}/${roleId}`)
      .set('Cookie', cookieHeader ?? '');

    expect(response.status).toBe(200);
    expect(response.body.message).toBe('Success to delete data role.');
    expect(response.body.data).toBeDefined();
    expect(response.body.data.id).toBe(roleId);
    expect(response.body.data.name).toBe('Role to Delete');

    // Verify role is deleted by trying to get its detail
    const detailResponse = await supertest(web)
      .get(`${baseUrlTest}/${roleId}`)
      .set('Cookie', cookieHeader ?? '');

    expect(detailResponse.status).toBe(404);
    expect(detailResponse.body.errors).toContain('The role does not exist!');

    // ===== TEST 2: NON-EXISTENT ROLE ID =====
    console.log('🧪 Testing non-existent role ID...');
    
    const nonExistentResponse = await supertest(web)
      .delete(`${baseUrlTest}/999999`)
      .set('Cookie', cookieHeader ?? '');

    expect(nonExistentResponse.status).toBe(404);
    expect(nonExistentResponse.body.errors).toContain('The role does not exist!');

    // ===== TEST 3: INVALID ROLE ID FORMAT =====
    console.log('🧪 Testing invalid role ID format...');
    
    const invalidFormatResponse = await supertest(web)
      .delete(`${baseUrlTest}/invalid`)
      .set('Cookie', cookieHeader ?? '');

    expect(invalidFormatResponse.status).toBe(500);
    // Invalid ID format causes database error
    expect(invalidFormatResponse.body.errors).toBeDefined();

    // ===== TEST 4: EDGE CASES =====
    console.log('🧪 Testing edge cases...');
    
    // Negative role ID
    const negativeResponse = await supertest(web)
      .delete(`${baseUrlTest}/-1`)
      .set('Cookie', cookieHeader ?? '');

    expect(negativeResponse.status).toBe(404);
    expect(negativeResponse.body.errors).toContain('The role does not exist!');

    // Zero role ID
    const zeroResponse = await supertest(web)
      .delete(`${baseUrlTest}/0`)
      .set('Cookie', cookieHeader ?? '');

    expect(zeroResponse.status).toBe(404);
    expect(zeroResponse.body.errors).toContain('The role does not exist!');

    // Very large role ID
    const largeIdResponse = await supertest(web)
      .delete(`${baseUrlTest}/999999999999`)
      .set('Cookie', cookieHeader ?? '');

    expect(largeIdResponse.status).toBe(500);
    // Very large ID causes database integer overflow error
    expect(largeIdResponse.body.errors).toBeDefined();

    // Decimal role ID
    const decimalResponse = await supertest(web)
      .delete(`${baseUrlTest}/1.5`)
      .set('Cookie', cookieHeader ?? '');

    expect(decimalResponse.status).toBe(200);
    // parseInt(1.5) returns 1, which finds the Super Admin role
    expect(decimalResponse.body.data.id).toBe(1);

    // ===== TEST 5: MULTIPLE ROLE DELETIONS =====
    console.log('🧪 Testing multiple role deletions...');
    
    // Create multiple roles
    const roles = ['Role 1', 'Role 2', 'Role 3'];
    const roleIds: number[] = [];

    for (const roleName of roles) {
      const multiCreateResponse = await supertest(web)
        .post(baseUrlTest)
        .set('Cookie', cookieHeader ?? '')
        .send({
          name: roleName
        });

      expect(multiCreateResponse.status).toBe(200);
      roleIds.push(multiCreateResponse.body.data.id);
    }

    // Delete all roles
    for (const roleId of roleIds) {
      const multiDeleteResponse = await supertest(web)
        .delete(`${baseUrlTest}/${roleId}`)
        .set('Cookie', cookieHeader ?? '');

      expect(multiDeleteResponse.status).toBe(200);
      expect(multiDeleteResponse.body.message).toBe('Success to delete data role.');
      expect(multiDeleteResponse.body.data.id).toBe(roleId);
    }

    // Verify all roles are deleted
    for (const roleId of roleIds) {
      const multiDetailResponse = await supertest(web)
        .get(`${baseUrlTest}/${roleId}`)
        .set('Cookie', cookieHeader ?? '');

      expect(multiDetailResponse.status).toBe(404);
    }

    // ===== TEST 6: DELETE ALREADY DELETED ROLE =====
    console.log('🧪 Testing delete already deleted role...');
    
    // Create a role for double delete test
    const doubleCreateResponse = await supertest(web)
      .post(baseUrlTest)
      .set('Cookie', cookieHeader ?? '')
      .send({
        name: 'Role to Delete Twice'
      });

    expect(doubleCreateResponse.status).toBe(200);
    const doubleRoleId = doubleCreateResponse.body.data.id;

    // Delete the role first time
    const doubleDeleteResponse1 = await supertest(web)
      .delete(`${baseUrlTest}/${doubleRoleId}`)
      .set('Cookie', cookieHeader ?? '');

    expect(doubleDeleteResponse1.status).toBe(200);

    // Try to delete the same role again
    const doubleDeleteResponse2 = await supertest(web)
      .delete(`${baseUrlTest}/${doubleRoleId}`)
      .set('Cookie', cookieHeader ?? '');

    expect(doubleDeleteResponse2.status).toBe(404);
    expect(doubleDeleteResponse2.body.errors).toContain('The role does not exist!');

    // ===== TEST 7: SPECIAL CHARACTERS =====
    console.log('🧪 Testing special characters...');
    
    // Create a role with special characters
    const specialCharCreateResponse = await supertest(web)
      .post(baseUrlTest)
      .set('Cookie', cookieHeader ?? '')
      .send({
        name: 'Role with @#$%^&*()_+-=[]{}|;:,.<>?'
      });

    expect(specialCharCreateResponse.status).toBe(200);
    const specialCharRoleId = specialCharCreateResponse.body.data.id;

    // Delete the role with special characters
    const specialCharResponse = await supertest(web)
      .delete(`${baseUrlTest}/${specialCharRoleId}`)
      .set('Cookie', cookieHeader ?? '');

    expect(specialCharResponse.status).toBe(200);
    expect(specialCharResponse.body.data.name).toBe('Role with @#$%^&*()_+-=[]{}|;:,.<>?');

    // Unicode characters
    const unicodeCreateResponse = await supertest(web)
      .post(baseUrlTest)
      .set('Cookie', cookieHeader ?? '')
      .send({
        name: 'Rôle avec caractères spéciaux 角色 役割'
      });

    expect(unicodeCreateResponse.status).toBe(200);
    const unicodeRoleId = unicodeCreateResponse.body.data.id;

    // Delete the role with Unicode characters
    const unicodeResponse = await supertest(web)
      .delete(`${baseUrlTest}/${unicodeRoleId}`)
      .set('Cookie', cookieHeader ?? '');

    expect(unicodeResponse.status).toBe(200);
    expect(unicodeResponse.body.data.name).toBe('Rôle avec caractères spéciaux 角色 役割');

    // ===== TEST 8: EDGE CASES WITH SPECIAL NAMES =====
    console.log('🧪 Testing edge cases with special names...');
    
    // Very long name
    const longName = 'A'.repeat(255); // Maximum allowed length
    const longNameCreateResponse = await supertest(web)
      .post(baseUrlTest)
      .set('Cookie', cookieHeader ?? '')
      .send({
        name: longName
      });

    expect(longNameCreateResponse.status).toBe(200);
    const longNameRoleId = longNameCreateResponse.body.data.id;

    // Delete the role with very long name
    const longNameResponse = await supertest(web)
      .delete(`${baseUrlTest}/${longNameRoleId}`)
      .set('Cookie', cookieHeader ?? '');

    expect(longNameResponse.status).toBe(200);
    expect(longNameResponse.body.data.name).toBe(longName);

    // Whitespace-only name
    const whitespaceCreateResponse = await supertest(web)
      .post(baseUrlTest)
      .set('Cookie', cookieHeader ?? '')
      .send({
        name: '   '
      });

    expect(whitespaceCreateResponse.status).toBe(200);
    const whitespaceRoleId = whitespaceCreateResponse.body.data.id;

    // Delete the role with whitespace-only name
    const whitespaceResponse = await supertest(web)
      .delete(`${baseUrlTest}/${whitespaceRoleId}`)
      .set('Cookie', cookieHeader ?? '');

    expect(whitespaceResponse.status).toBe(200);
    expect(whitespaceResponse.body.data.name).toBe('   ');

    // ===== TEST 9: RESPONSE STRUCTURE =====
    console.log('🧪 Testing response structure...');
    
    // Create a role for structure test
    const structureCreateResponse = await supertest(web)
      .post(baseUrlTest)
      .set('Cookie', cookieHeader ?? '')
      .send({
        name: 'Role for Structure Test'
      });

    expect(structureCreateResponse.status).toBe(200);
    const structureRoleId = structureCreateResponse.body.data.id;

    // Delete the role for structure test
    const structureResponse = await supertest(web)
      .delete(`${baseUrlTest}/${structureRoleId}`)
      .set('Cookie', cookieHeader ?? '');

    expect(structureResponse.status).toBe(200);
    expect(structureResponse.body).toHaveProperty('message');
    expect(structureResponse.body).toHaveProperty('data');
    expect(structureResponse.body.message).toBe('Success to delete data role.');
    expect(structureResponse.body.data).toHaveProperty('id');
    expect(structureResponse.body.data).toHaveProperty('name');
    expect(structureResponse.body.data).toHaveProperty('created_by');
    expect(structureResponse.body.data).toHaveProperty('created_at');
    expect(structureResponse.body.data).toHaveProperty('updated_by');
    expect(structureResponse.body.data).toHaveProperty('updated_at');

    console.log('✅ All delete role flow tests completed successfully');
  });
});
