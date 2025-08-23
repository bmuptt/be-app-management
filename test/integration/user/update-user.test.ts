import dotenv from 'dotenv';
import { TestHelper, AuthLogic } from '../../test-util';
import supertest from 'supertest';
import { web } from '../../../src/config/web';
import { logger } from '../../../src/config/logging';

dotenv.config();

const baseUrlTest = '/api/app-management/user';

describe('Update User Business Flow', () => {
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

  it('Should handle complete update user flow including validation, edge cases, and response structure', async () => {
    // Increase timeout for this comprehensive test
    jest.setTimeout(30000);

    // ===== TEST 1: SUCCESSFUL USER UPDATE =====
    console.log('🧪 Testing successful user update...');
    
    // First create a new user to update
    const createResponse = await supertest(web)
      .post(baseUrlTest)
      .set('Cookie', cookieHeader ?? '')
      .send({
        email: 'testuser@example.com',
        name: 'Test User',
        gender: 'Male',
        birthdate: '1990-01-01',
        role_id: 1
      });

    expect(createResponse.status).toBe(200);
    const userId = createResponse.body.data.id;

    const updateData = {
      email: 'updated@example.com',
      name: 'Updated User',
      gender: 'Female',
      birthdate: '1995-06-15',
      role_id: 1
    };

    const response = await supertest(web)
      .patch(`${baseUrlTest}/${userId}`)
      .set('Cookie', cookieHeader ?? '')
      .send(updateData);

    expect(response.status).toBe(200);
    expect(response.body.message).toBe('Success to edit data user.');
    expect(response.body.data).toBeDefined();
    expect(response.body.data.name).toBe(updateData.name);
    expect(response.body.data.gender).toBe(updateData.gender);
    expect(response.body.data.birthdate).toBeDefined();
    expect(response.body.data.role_id).toBe(updateData.role_id);

    // ===== TEST 2: VALIDATION ERRORS FOR MISSING REQUIRED FIELDS =====
    console.log('🧪 Testing validation errors for missing required fields...');
    
    const missingFieldsResponse = await supertest(web)
      .patch(`${baseUrlTest}/2`)
      .set('Cookie', cookieHeader ?? '')
      .send({});

    expect(missingFieldsResponse.status).toBe(400);
    expect(missingFieldsResponse.body.errors).toContain('The email is required!');
    expect(missingFieldsResponse.body.errors).toContain('The name is required!');
    expect(missingFieldsResponse.body.errors).toContain('The gender is required!');
    expect(missingFieldsResponse.body.errors).toContain('The birthdate is required!');
    expect(missingFieldsResponse.body.errors).toContain('The role is required!');

    // ===== TEST 3: VALIDATION ERRORS FOR INVALID EMAIL FORMAT =====
    console.log('🧪 Testing validation errors for invalid email format...');
    
    const emailTestCases = [
      { email: 'invalid-email', expectedError: 'Invalid email' },
      { email: 'test@', expectedError: 'Invalid email' },
      { email: '@example.com', expectedError: 'Invalid email' },
      { email: 'test.example.com', expectedError: 'Invalid email' },
      { email: 'test@example', expectedError: 'Invalid email' },
    ];

    for (const testCase of emailTestCases) {
      const emailResponse = await supertest(web)
        .patch(`${baseUrlTest}/2`)
        .set('Cookie', cookieHeader ?? '')
        .send({
          email: testCase.email,
          name: 'Test User',
          gender: 'Male',
          birthdate: '1990-01-01',
          role_id: 1
        });

      expect(emailResponse.status).toBe(400);
      expect(emailResponse.body.errors).toContain(testCase.expectedError);
    }

    // ===== TEST 4: VALIDATION ERRORS FOR INVALID BIRTHDATE FORMAT =====
    console.log('🧪 Testing validation errors for invalid birthdate format...');
    
    const birthdateTestCases = [
      { birthdate: 'invalid-date', expectedError: 'The birthdate format must be: YYYY-MM-DD!' },
      { birthdate: '1990/01/01', expectedError: 'The birthdate format must be: YYYY-MM-DD!' },
      { birthdate: '01-01-1990', expectedError: 'The birthdate format must be: YYYY-MM-DD!' },
      { birthdate: '1990-13-01', expectedError: 'The birthdate format must be: YYYY-MM-DD!' },
      { birthdate: '1990-01-32', expectedError: 'The birthdate format must be: YYYY-MM-DD!' },
    ];

    for (const testCase of birthdateTestCases) {
      const birthdateResponse = await supertest(web)
        .patch(`${baseUrlTest}/2`)
        .set('Cookie', cookieHeader ?? '')
        .send({
          email: 'test@example.com',
          name: 'Test User',
          gender: 'Male',
          birthdate: testCase.birthdate,
          role_id: 1
        });

      expect(birthdateResponse.status).toBe(400);
      expect(birthdateResponse.body.errors).toContain(testCase.expectedError);
    }

    // ===== TEST 5: DUPLICATE EMAIL ERROR =====
    console.log('🧪 Testing duplicate email error...');
    
    // Create first user
    const firstUserResponse = await supertest(web)
      .post(baseUrlTest)
      .set('Cookie', cookieHeader ?? '')
      .send({
        email: 'first@example.com',
        name: 'First User',
        gender: 'Male',
        birthdate: '1990-01-01',
        role_id: 1
      });

    expect(firstUserResponse.status).toBe(200);
    const firstUserId = firstUserResponse.body.data.id;

    // Create second user
    const secondUserResponse = await supertest(web)
      .post(baseUrlTest)
      .set('Cookie', cookieHeader ?? '')
      .send({
        email: 'second@example.com',
        name: 'Second User',
        gender: 'Female',
        birthdate: '1995-05-05',
        role_id: 1
      });

    expect(secondUserResponse.status).toBe(200);
    const secondUserId = secondUserResponse.body.data.id;

    // Try to update second user with first user's email
    const duplicateResponse = await supertest(web)
      .patch(`${baseUrlTest}/${secondUserId}`)
      .set('Cookie', cookieHeader ?? '')
      .send({
        email: 'first@example.com',
        name: 'Second User',
        gender: 'Female',
        birthdate: '1995-05-05',
        role_id: 1
      });

    expect(duplicateResponse.status).toBe(400);
    expect(duplicateResponse.body.errors).toContain('The email cannot be the same!');

    // ===== TEST 6: NON-EXISTENT USER ID =====
    console.log('🧪 Testing non-existent user ID...');
    
    const nonExistentResponse = await supertest(web)
      .patch(`${baseUrlTest}/999`)
      .set('Cookie', cookieHeader ?? '')
      .send({
        email: 'test@example.com',
        name: 'Test User',
        gender: 'Male',
        birthdate: '1990-01-01',
        role_id: 1
      });

    expect(nonExistentResponse.status).toBe(404);
    expect(nonExistentResponse.body.errors).toContain('The user does not exist!');

    // ===== TEST 7: INVALID USER ID FORMAT =====
    console.log('🧪 Testing invalid user ID format...');
    
    const invalidFormatResponse = await supertest(web)
      .patch(`${baseUrlTest}/invalid`)
      .set('Cookie', cookieHeader ?? '')
      .send({
        email: 'test@example.com',
        name: 'Test User',
        gender: 'Male',
        birthdate: '1990-01-01',
        role_id: 1
      });

    expect(invalidFormatResponse.status).toBe(500);
    // Invalid ID format causes database error

    // ===== TEST 8: DIFFERENT GENDER VALUES =====
    console.log('🧪 Testing different gender values...');
    
    const genderTestCases = [
      { gender: 'Male', name: 'Male User' },
      { gender: 'Female', name: 'Female User' },
    ];

    for (const testCase of genderTestCases) {
      const genderResponse = await supertest(web)
        .patch(`${baseUrlTest}/${firstUserId}`)
        .set('Cookie', cookieHeader ?? '')
        .send({
          email: 'first@example.com',
          name: testCase.name,
          gender: testCase.gender,
          birthdate: '1990-01-01',
          role_id: 1
        });

      expect(genderResponse.status).toBe(200);
      expect(genderResponse.body.data.gender).toBe(testCase.gender);
      expect(genderResponse.body.data.name).toBe(testCase.name);
    }

    // ===== TEST 9: VARIOUS VALID BIRTHDATE FORMATS =====
    console.log('🧪 Testing various valid birthdate formats...');
    
    const birthdateValidTestCases = [
      { birthdate: '1990-01-01', name: 'User1990' },
      { birthdate: '2000-12-31', name: 'User2000' },
      { birthdate: '1985-06-15', name: 'User1985' },
      { birthdate: '2020-02-29', name: 'User2020' }, // Leap year
    ];

    for (const testCase of birthdateValidTestCases) {
      const birthdateValidResponse = await supertest(web)
        .patch(`${baseUrlTest}/${firstUserId}`)
        .set('Cookie', cookieHeader ?? '')
        .send({
          email: 'first@example.com',
          name: testCase.name,
          gender: 'Male',
          birthdate: testCase.birthdate,
          role_id: 1
        });

      expect(birthdateValidResponse.status).toBe(200);
      expect(birthdateValidResponse.body.data.birthdate).toContain(testCase.birthdate);
      expect(birthdateValidResponse.body.data.name).toBe(testCase.name);
    }

    // ===== TEST 10: SPECIAL CHARACTERS IN NAME FIELD =====
    console.log('🧪 Testing special characters in name field...');
    
    const specialCharTestCases = [
      { name: 'John-Doe', gender: 'Male' },
      { name: "O'Connor", gender: 'Male' },
      { name: 'Mary Jane', gender: 'Female' },
    ];

    for (const testCase of specialCharTestCases) {
      const specialCharResponse = await supertest(web)
        .patch(`${baseUrlTest}/${firstUserId}`)
        .set('Cookie', cookieHeader ?? '')
        .send({
          email: 'first@example.com',
          name: testCase.name,
          gender: testCase.gender,
          birthdate: '1990-01-01',
          role_id: 1
        });

      expect(specialCharResponse.status).toBe(200);
      expect(specialCharResponse.body.data.name).toBe(testCase.name);
      expect(specialCharResponse.body.data.gender).toBe(testCase.gender);
    }

    // ===== TEST 11: USER UPDATE WITH EXTRA FIELDS =====
    console.log('🧪 Testing user update with extra fields...');
    
    const extraFieldsData = {
      email: 'first@example.com',
      name: 'Test User',
      gender: 'Male',
      birthdate: '1990-01-01',
      role_id: 1,
      extra_field: 'should be ignored',
      another_field: 123,
      nested_field: { key: 'value' }
    };

    const extraFieldsResponse = await supertest(web)
      .patch(`${baseUrlTest}/${firstUserId}`)
      .set('Cookie', cookieHeader ?? '')
      .send(extraFieldsData);

    expect(extraFieldsResponse.status).toBe(200);
    expect(extraFieldsResponse.body.data.email).toBe(extraFieldsData.email);
    expect(extraFieldsResponse.body.data.name).toBe(extraFieldsData.name);
    expect(extraFieldsResponse.body.data.gender).toBe(extraFieldsData.gender);
    expect(extraFieldsResponse.body.data.extra_field).toBeUndefined();
    expect(extraFieldsResponse.body.data.another_field).toBeUndefined();
    expect(extraFieldsResponse.body.data.nested_field).toBeUndefined();

    // ===== TEST 12: DIFFERENT ROLE ASSIGNMENTS =====
    console.log('🧪 Testing different role assignments...');
    
    const roleTestCases = [
      { role_id: 1, name: 'Role1User' },
      { role_id: 1, name: 'Role1User2' }, // Same role, different user
    ];

    for (const testCase of roleTestCases) {
      const roleResponse = await supertest(web)
        .patch(`${baseUrlTest}/${firstUserId}`)
        .set('Cookie', cookieHeader ?? '')
        .send({
          email: 'first@example.com',
          name: testCase.name,
          gender: 'Male',
          birthdate: '1990-01-01',
          role_id: testCase.role_id
        });

      expect(roleResponse.status).toBe(200);
      expect(roleResponse.body.data.role_id).toBe(testCase.role_id);
      expect(roleResponse.body.data.name).toBe(testCase.name);
    }

    // ===== TEST 13: RESPONSE STRUCTURE =====
    console.log('🧪 Testing response structure...');
    
    const structureResponse = await supertest(web)
      .patch(`${baseUrlTest}/${firstUserId}`)
      .set('Cookie', cookieHeader ?? '')
      .send({
        email: 'first@example.com',
        name: 'Structure Test User',
        gender: 'Male',
        birthdate: '1990-01-01',
        role_id: 1
      });

    expect(structureResponse.status).toBe(200);
    expect(structureResponse.body).toHaveProperty('message');
    expect(structureResponse.body).toHaveProperty('data');
    expect(structureResponse.body.message).toBe('Success to edit data user.');
    expect(structureResponse.body.data).toHaveProperty('id');
    expect(structureResponse.body.data).toHaveProperty('email');
    expect(structureResponse.body.data).toHaveProperty('name');
    expect(structureResponse.body.data).toHaveProperty('gender');
    expect(structureResponse.body.data).toHaveProperty('birthdate');
    expect(structureResponse.body.data).toHaveProperty('active');
    expect(structureResponse.body.data).toHaveProperty('role_id');
    expect(structureResponse.body.data).toHaveProperty('created_at');
    expect(structureResponse.body.data).toHaveProperty('updated_at');
    expect(structureResponse.body.data).toHaveProperty('created_by');
    expect(structureResponse.body.data).toHaveProperty('updated_by');
    expect(structureResponse.body.data).toHaveProperty('photo');

    console.log('✅ All update user flow tests completed successfully');
  });
});
