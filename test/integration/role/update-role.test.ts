import dotenv from 'dotenv';
import { TestHelper, AuthLogic } from '../../test-util';
import supertest from 'supertest';
import { web } from '../../../src/config/web';
import { logger } from '../../../src/config/logging';

dotenv.config();

const baseUrlTest = '/api/app-management/role';

describe('Update Role Business Flow', () => {
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

  it('Should handle complete update role flow including validation, edge cases, and response structure', async () => {
    // Increase timeout for this comprehensive test
    jest.setTimeout(30000);
    
    // ===== TEST 1: SUCCESSFUL ROLE UPDATE =====
    console.log('🧪 Testing successful role update...');
    
    // First create a role
    const createResponse = await supertest(web)
      .post(baseUrlTest)
      .set('Cookie', cookieHeader ?? '')
      .send({
        name: 'Original Role Name'
      });

    expect(createResponse.status).toBe(200);
    const roleId = createResponse.body.data.id;

    // Update the role
    const response = await supertest(web)
      .patch(`${baseUrlTest}/${roleId}`)
      .set('Cookie', cookieHeader ?? '')
      .send({
        name: 'Updated Role Name'
      });

    expect(response.status).toBe(200);
    expect(response.body.message).toBe('Success to edit data role.');
    expect(response.body.data).toBeDefined();
    expect(response.body.data.id).toBe(roleId);
    expect(response.body.data.name).toBe('Updated Role Name');
    expect(response.body.data.updated_by).toBe(1); // Admin user ID

    // ===== TEST 2: DUPLICATE ROLE NAME DURING UPDATE =====
    console.log('🧪 Testing duplicate role name during update...');
    
    // Create first role
    const createResponse1 = await supertest(web)
      .post(baseUrlTest)
      .set('Cookie', cookieHeader ?? '')
      .send({
        name: 'First Role'
      });

    expect(createResponse1.status).toBe(200);
    const roleId1 = createResponse1.body.data.id;

    // Create second role
    const createResponse2 = await supertest(web)
      .post(baseUrlTest)
      .set('Cookie', cookieHeader ?? '')
      .send({
        name: 'Second Role'
      });

    expect(createResponse2.status).toBe(200);
    const roleId2 = createResponse2.body.data.id;

    // Try to update second role with first role's name
    const duplicateResponse = await supertest(web)
      .patch(`${baseUrlTest}/${roleId2}`)
      .set('Cookie', cookieHeader ?? '')
      .send({
        name: 'First Role'
      });

    expect(duplicateResponse.status).toBe(400);
    expect(duplicateResponse.body.errors).toContain('The name cannot be the same!');

    // ===== TEST 3: NON-EXISTENT ROLE ID =====
    console.log('🧪 Testing non-existent role ID...');
    
    const nonExistentResponse = await supertest(web)
      .patch(`${baseUrlTest}/999999`)
      .set('Cookie', cookieHeader ?? '')
      .send({
        name: 'Updated Name'
      });

    expect(nonExistentResponse.status).toBe(404);
    expect(nonExistentResponse.body.errors).toContain('The role does not exist!');

    // ===== TEST 4: VALIDATION ERRORS =====
    console.log('🧪 Testing validation errors...');
    
    // Create a role for validation tests
    const validationCreateResponse = await supertest(web)
      .post(baseUrlTest)
      .set('Cookie', cookieHeader ?? '')
      .send({
        name: 'Test Role'
      });

    expect(validationCreateResponse.status).toBe(200);
    const validationRoleId = validationCreateResponse.body.data.id;

    // Missing name field
    const missingNameResponse = await supertest(web)
      .patch(`${baseUrlTest}/${validationRoleId}`)
      .set('Cookie', cookieHeader ?? '')
      .send({});

    expect(missingNameResponse.status).toBe(400);
    expect(missingNameResponse.body.errors).toContain('The name is required!');

    // Empty name field
    const emptyNameResponse = await supertest(web)
      .patch(`${baseUrlTest}/${validationRoleId}`)
      .set('Cookie', cookieHeader ?? '')
      .send({
        name: ''
      });

    expect(emptyNameResponse.status).toBe(400);
    expect(emptyNameResponse.body.errors).toContain('The name is required!');

    // ===== TEST 5: EDGE CASES =====
    console.log('🧪 Testing edge cases...');
    
    // Whitespace-only name
    const whitespaceResponse = await supertest(web)
      .patch(`${baseUrlTest}/${validationRoleId}`)
      .set('Cookie', cookieHeader ?? '')
      .send({
        name: '   '
      });

    expect(whitespaceResponse.status).toBe(200);
    expect(whitespaceResponse.body.data.name).toBe('   ');

    // Test with maximum valid length (255 characters)
    const maxValidName = 'A'.repeat(255); // Exactly 255 characters (database limit)
    const maxValidResponse = await supertest(web)
      .patch(`${baseUrlTest}/${validationRoleId}`)
      .set('Cookie', cookieHeader ?? '')
      .send({
        name: maxValidName
      });

    expect(maxValidResponse.status).toBe(200);
    expect(maxValidResponse.body.data.name).toBe(maxValidName);

    // Test with name that exceeds database limit (256 characters)
    const tooLongName = 'A'.repeat(256); // Exceeds 255 character limit
    const tooLongResponse = await supertest(web)
      .patch(`${baseUrlTest}/${validationRoleId}`)
      .set('Cookie', cookieHeader ?? '')
      .send({
        name: tooLongName
      });

    expect(tooLongResponse.status).toBe(500);
    expect(tooLongResponse.body.errors).toBeDefined();

    // ===== TEST 6: SPECIAL CHARACTERS =====
    console.log('🧪 Testing special characters...');
    
    // Special characters in role name
    const specialName = 'Role with @#$%^&*()_+-=[]{}|;:,.<>?';
    const specialCharResponse = await supertest(web)
      .patch(`${baseUrlTest}/${validationRoleId}`)
      .set('Cookie', cookieHeader ?? '')
      .send({
        name: specialName
      });

    expect(specialCharResponse.status).toBe(200);
    expect(specialCharResponse.body.data.name).toBe(specialName);

    // Unicode characters in role name
    const unicodeName = 'Rôle avec caractères spéciaux 角色 役割';
    const unicodeResponse = await supertest(web)
      .patch(`${baseUrlTest}/${validationRoleId}`)
      .set('Cookie', cookieHeader ?? '')
      .send({
        name: unicodeName
      });

    expect(unicodeResponse.status).toBe(200);
    expect(unicodeResponse.body.data.name).toBe(unicodeName);

    // ===== TEST 7: INVALID ROLE ID FORMAT =====
    console.log('🧪 Testing invalid role ID format...');
    
    const invalidFormatResponse = await supertest(web)
      .patch(`${baseUrlTest}/invalid`)
      .set('Cookie', cookieHeader ?? '')
      .send({
        name: 'Updated Name'
      });

    expect(invalidFormatResponse.status).toBe(500);
    // Invalid ID format causes database error
    expect(invalidFormatResponse.body.errors).toBeDefined();

    // Negative role ID
    const negativeResponse = await supertest(web)
      .patch(`${baseUrlTest}/-1`)
      .set('Cookie', cookieHeader ?? '')
      .send({
        name: 'Updated Name'
      });

    expect(negativeResponse.status).toBe(404);
    expect(negativeResponse.body.errors).toContain('The role does not exist!');

    // Zero role ID
    const zeroResponse = await supertest(web)
      .patch(`${baseUrlTest}/0`)
      .set('Cookie', cookieHeader ?? '')
      .send({
        name: 'Updated Name'
      });

    expect(zeroResponse.status).toBe(404);
    expect(zeroResponse.body.errors).toContain('The role does not exist!');

    // ===== TEST 8: CASE-SENSITIVE DUPLICATE DETECTION =====
    console.log('🧪 Testing case-sensitive duplicate detection...');
    
    // Create first role for case test
    const caseCreateResponse1 = await supertest(web)
      .post(baseUrlTest)
      .set('Cookie', cookieHeader ?? '')
      .send({
        name: 'Test Role'
      });

    expect(caseCreateResponse1.status).toBe(200);
    const caseRoleId1 = caseCreateResponse1.body.data.id;

    // Create second role for case test
    const caseCreateResponse2 = await supertest(web)
      .post(baseUrlTest)
      .set('Cookie', cookieHeader ?? '')
      .send({
        name: 'Another Role'
      });

    expect(caseCreateResponse2.status).toBe(200);
    const caseRoleId2 = caseCreateResponse2.body.data.id;

    // Try to update second role with different case of first role's name
    const caseResponse = await supertest(web)
      .patch(`${baseUrlTest}/${caseRoleId2}`)
      .set('Cookie', cookieHeader ?? '')
      .send({
        name: 'test role'
      });

    expect(caseResponse.status).toBe(200);
    expect(caseResponse.body.data.name).toBe('test role');

    // ===== TEST 9: MULTIPLE UPDATES ON SAME ROLE =====
    console.log('🧪 Testing multiple updates on same role...');
    
    // Create a role for multiple updates
    const multiCreateResponse = await supertest(web)
      .post(baseUrlTest)
      .set('Cookie', cookieHeader ?? '')
      .send({
        name: 'Original Name'
      });

    expect(multiCreateResponse.status).toBe(200);
    const multiRoleId = multiCreateResponse.body.data.id;

    // Update multiple times
    const updates = ['First Update', 'Second Update', 'Final Update'];
    
    for (const updateName of updates) {
      const multiUpdateResponse = await supertest(web)
        .patch(`${baseUrlTest}/${multiRoleId}`)
        .set('Cookie', cookieHeader ?? '')
        .send({
          name: updateName
        });

      expect(multiUpdateResponse.status).toBe(200);
      expect(multiUpdateResponse.body.data.name).toBe(updateName);
    }

    // ===== TEST 10: RESPONSE STRUCTURE =====
    console.log('🧪 Testing response structure...');
    
    // Create a role for structure test
    const structureCreateResponse = await supertest(web)
      .post(baseUrlTest)
      .set('Cookie', cookieHeader ?? '')
      .send({
        name: 'Structure Test Role'
      });

    expect(structureCreateResponse.status).toBe(200);
    const structureRoleId = structureCreateResponse.body.data.id;

    // Update the role for structure test
    const structureResponse = await supertest(web)
      .patch(`${baseUrlTest}/${structureRoleId}`)
      .set('Cookie', cookieHeader ?? '')
      .send({
        name: 'Updated Role Structure'
      });

    expect(structureResponse.status).toBe(200);
    expect(structureResponse.body).toHaveProperty('message');
    expect(structureResponse.body).toHaveProperty('data');
    expect(structureResponse.body.message).toBe('Success to edit data role.');
    expect(structureResponse.body.data).toHaveProperty('id');
    expect(structureResponse.body.data).toHaveProperty('name');
    expect(structureResponse.body.data).toHaveProperty('created_by');
    expect(structureResponse.body.data).toHaveProperty('created_at');
    expect(structureResponse.body.data).toHaveProperty('updated_by');
    expect(structureResponse.body.data).toHaveProperty('updated_at');

    console.log('✅ All update role flow tests completed successfully');
  });
});
