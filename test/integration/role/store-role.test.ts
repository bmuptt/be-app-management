import dotenv from 'dotenv';
import { TestHelper, AuthLogic } from '../../test-util';
import supertest from 'supertest';
import { web } from '../../../src/config/web';
import { logger } from '../../../src/config/logging';

dotenv.config();

const baseUrlTest = '/api/app-management/role';

describe('Store Role Business Flow', () => {
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

  it('Should handle complete store role flow including validation, edge cases, and response structure', async () => {
    // Increase timeout for this comprehensive test
    jest.setTimeout(30000);
    // ===== TEST 1: SUCCESSFUL ROLE CREATION =====
    console.log('🧪 Testing successful role creation...');
    
    const response = await supertest(web)
      .post(baseUrlTest)
      .set('Cookie', cookieHeader ?? '')
      .send({
        name: 'Test Role'
      });

    expect(response.status).toBe(200);
    expect(response.body.message).toBe('Success to add data role.');
    expect(response.body.data).toBeDefined();
    expect(response.body.data.name).toBe('Test Role');
    expect(response.body.data.created_by).toBe(1); // Admin user ID
    expect(response.body.data.id).toBeDefined();

    // ===== TEST 2: DUPLICATE ROLE NAME =====
    console.log('🧪 Testing duplicate role name...');
    
    // Try to create another role with the same name
    const duplicateResponse = await supertest(web)
      .post(baseUrlTest)
      .set('Cookie', cookieHeader ?? '')
      .send({
        name: 'Test Role'
      });

    expect(duplicateResponse.status).toBe(400);
    expect(duplicateResponse.body.errors).toContain('The name cannot be the same!');

    // ===== TEST 3: VALIDATION ERRORS =====
    console.log('🧪 Testing validation errors...');
    
    // Missing name field
    const missingNameResponse = await supertest(web)
      .post(baseUrlTest)
      .set('Cookie', cookieHeader ?? '')
      .send({});

    expect(missingNameResponse.status).toBe(400);
    expect(missingNameResponse.body.errors).toContain('The name is required!');

    // Empty name field
    const emptyNameResponse = await supertest(web)
      .post(baseUrlTest)
      .set('Cookie', cookieHeader ?? '')
      .send({
        name: ''
      });

    expect(emptyNameResponse.status).toBe(400);
    expect(emptyNameResponse.body.errors).toContain('The name is required!');

    // ===== TEST 4: EDGE CASES =====
    console.log('🧪 Testing edge cases...');
    
    // Whitespace-only name
    const whitespaceResponse = await supertest(web)
      .post(baseUrlTest)
      .set('Cookie', cookieHeader ?? '')
      .send({
        name: '   '
      });

    expect(whitespaceResponse.status).toBe(200);
    expect(whitespaceResponse.body.data.name).toBe('   ');

    // Test with maximum valid length (255 characters)
    const maxValidName = 'A'.repeat(255); // Exactly 255 characters (database limit)
    const maxValidResponse = await supertest(web)
      .post(baseUrlTest)
      .set('Cookie', cookieHeader ?? '')
      .send({
        name: maxValidName
      });

    expect(maxValidResponse.status).toBe(200);
    expect(maxValidResponse.body.data.name).toBe(maxValidName);

    // Test with name that exceeds database limit (256 characters)
    const tooLongName = 'A'.repeat(256); // Exceeds 255 character limit
    const tooLongResponse = await supertest(web)
      .post(baseUrlTest)
      .set('Cookie', cookieHeader ?? '')
      .send({
        name: tooLongName
      });

    expect(tooLongResponse.status).toBe(500);
    expect(tooLongResponse.body.errors).toBeDefined();

    // ===== TEST 5: SPECIAL CHARACTERS =====
    console.log('🧪 Testing special characters...');
    
    // Special characters in role name
    const specialName = 'Role with @#$%^&*()_+-=[]{}|;:,.<>?';
    const specialCharResponse = await supertest(web)
      .post(baseUrlTest)
      .set('Cookie', cookieHeader ?? '')
      .send({
        name: specialName
      });

    expect(specialCharResponse.status).toBe(200);
    expect(specialCharResponse.body.data.name).toBe(specialName);

    // Unicode characters in role name
    const unicodeName = 'Rôle avec caractères spéciaux 角色 役割';
    const unicodeResponse = await supertest(web)
      .post(baseUrlTest)
      .set('Cookie', cookieHeader ?? '')
      .send({
        name: unicodeName
      });

    expect(unicodeResponse.status).toBe(200);
    expect(unicodeResponse.body.data.name).toBe(unicodeName);

    // ===== TEST 6: MULTIPLE ROLE CREATION =====
    console.log('🧪 Testing multiple role creation...');
    
    const roles = ['Role 1', 'Role 2', 'Role 3'];
    
    for (const roleName of roles) {
      const multiResponse = await supertest(web)
        .post(baseUrlTest)
        .set('Cookie', cookieHeader ?? '')
        .send({
          name: roleName
        });

      expect(multiResponse.status).toBe(200);
      expect(multiResponse.body.data.name).toBe(roleName);
    }

    // ===== TEST 7: CASE-SENSITIVE DUPLICATE DETECTION =====
    console.log('🧪 Testing case-sensitive duplicate detection...');
    
    // Create a role with different case
    const caseResponse = await supertest(web)
      .post(baseUrlTest)
      .set('Cookie', cookieHeader ?? '')
      .send({
        name: 'test role'
      });

    expect(caseResponse.status).toBe(200);
    expect(caseResponse.body.data.name).toBe('test role');

    // ===== TEST 8: RESPONSE STRUCTURE =====
    console.log('🧪 Testing response structure...');
    
    const structureResponse = await supertest(web)
      .post(baseUrlTest)
      .set('Cookie', cookieHeader ?? '')
      .send({
        name: 'Test Role Structure'
      });

    expect(structureResponse.status).toBe(200);
    expect(structureResponse.body).toHaveProperty('message');
    expect(structureResponse.body).toHaveProperty('data');
    expect(structureResponse.body.message).toBe('Success to add data role.');
    expect(structureResponse.body.data).toHaveProperty('id');
    expect(structureResponse.body.data).toHaveProperty('name');
    expect(structureResponse.body.data).toHaveProperty('created_by');
    expect(structureResponse.body.data).toHaveProperty('created_at');
    expect(structureResponse.body.data).toHaveProperty('updated_by');
    expect(structureResponse.body.data).toHaveProperty('updated_at');

    console.log('✅ All store role flow tests completed successfully');
  });
});
