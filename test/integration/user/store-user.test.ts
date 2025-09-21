import dotenv from 'dotenv';
import { TestHelper, AuthLogic } from '../../test-util';
import supertest from 'supertest';
import { web } from '../../../src/config/web';
import { logger } from '../../../src/config/logging';

dotenv.config();

const baseUrlTest = '/api/app-management/user';

describe('Store User Business Flow', () => {
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

  it('Should handle complete store user flow including validation, edge cases, and response structure', async () => {
    // Increase timeout for this comprehensive test
    jest.setTimeout(30000);

    // ===== TEST 1: SUCCESSFUL USER CREATION =====
    console.log('🧪 Testing successful user creation...');

    const userData = {
      email: 'newuser@example.com',
      name: 'New User',
      gender: 'Male',
      birthdate: '1990-01-01',
      role_id: 1,
    };

    const response = await supertest(web)
      .post(baseUrlTest)
      .set('Cookie', cookieHeader ?? '')
      .send(userData);

    expect(response.status).toBe(200);
    expect(response.body.data).toBeDefined();
    expect(response.body.data.email).toBe(userData.email);
    expect(response.body.data.name).toBe(userData.name);
    expect(response.body.data.gender).toBe(userData.gender);
    expect(response.body.data.birthdate).toContain(userData.birthdate);
    expect(response.body.data.role_id).toBe(userData.role_id);

    // ===== TEST 2: VALIDATION ERRORS FOR MISSING REQUIRED FIELDS =====
    console.log('🧪 Testing validation errors for missing required fields...');

    const testCases = [
      {
        data: {},
        expectedErrors: [
          'The email is required!',
          'The name is required!',
          'The gender is required!',
          'The birthdate is required!',
        ],
      },
      {
        data: { email: 'test@example.com' },
        expectedErrors: [
          'The name is required!',
          'The gender is required!',
          'The birthdate is required!',
        ],
      },
      {
        data: { email: 'test@example.com', name: 'Test User' },
        expectedErrors: [
          'The gender is required!',
          'The birthdate is required!',
        ],
      },
      {
        data: { email: 'test@example.com', name: 'Test User', gender: 'Male' },
        expectedErrors: ['The birthdate is required!'],
      },
    ];

    for (const testCase of testCases) {
      const validationResponse = await supertest(web)
        .post(baseUrlTest)
        .set('Cookie', cookieHeader ?? '')
        .send(testCase.data);

      expect(validationResponse.status).toBe(400);
      expect(validationResponse.body.errors).toEqual(
        expect.arrayContaining(testCase.expectedErrors),
      );
    }

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
        .post(baseUrlTest)
        .set('Cookie', cookieHeader ?? '')
        .send({
          email: testCase.email,
          name: 'Test User',
          gender: 'Male',
          birthdate: '1990-01-01',
          role_id: 1,
        });

      expect(emailResponse.status).toBe(400);
      expect(emailResponse.body.errors).toContain(testCase.expectedError);
    }

    // ===== TEST 4: VALIDATION ERRORS FOR INVALID BIRTHDATE FORMAT =====
    console.log('🧪 Testing validation errors for invalid birthdate format...');

    const birthdateTestCases = [
      {
        birthdate: 'invalid-date',
        expectedError: 'The birthdate format must be: YYYY-MM-DD!',
      },
      {
        birthdate: '1990/01/01',
        expectedError: 'The birthdate format must be: YYYY-MM-DD!',
      },
      {
        birthdate: '01-01-1990',
        expectedError: 'The birthdate format must be: YYYY-MM-DD!',
      },
      {
        birthdate: '1990-13-01',
        expectedError: 'The birthdate format must be: YYYY-MM-DD!',
      },
      {
        birthdate: '1990-01-32',
        expectedError: 'The birthdate format must be: YYYY-MM-DD!',
      },
      {
        birthdate: '1990-00-01',
        expectedError: 'The birthdate format must be: YYYY-MM-DD!',
      },
      {
        birthdate: '1990-01-00',
        expectedError: 'The birthdate format must be: YYYY-MM-DD!',
      },
    ];

    for (const testCase of birthdateTestCases) {
      const birthdateResponse = await supertest(web)
        .post(baseUrlTest)
        .set('Cookie', cookieHeader ?? '')
        .send({
          email: 'test@example.com',
          name: 'Test User',
          gender: 'Male',
          birthdate: testCase.birthdate,
          role_id: 1,
        });

      expect(birthdateResponse.status).toBe(400);
      expect(birthdateResponse.body.errors).toContain(testCase.expectedError);
    }

    // ===== TEST 5: VALIDATION ERRORS FOR EMPTY FIELDS =====
    console.log('🧪 Testing validation errors for empty fields...');

    // Empty gender
    const emptyGenderResponse = await supertest(web)
      .post(baseUrlTest)
      .set('Cookie', cookieHeader ?? '')
      .send({
        email: 'test@example.com',
        name: 'Test User',
        gender: '',
        birthdate: '1990-01-01',
        role_id: 1,
      });

    expect(emptyGenderResponse.status).toBe(400);
    expect(emptyGenderResponse.body.errors).toContain(
      'The gender is required!',
    );

    // Empty name
    const emptyNameResponse = await supertest(web)
      .post(baseUrlTest)
      .set('Cookie', cookieHeader ?? '')
      .send({
        email: 'test@example.com',
        name: '',
        gender: 'Male',
        birthdate: '1990-01-01',
        role_id: 1,
      });

    expect(emptyNameResponse.status).toBe(400);
    expect(emptyNameResponse.body.errors).toContain('The name is required!');

    // ===== TEST 6: DUPLICATE EMAIL ERROR =====
    console.log('🧪 Testing duplicate email error...');

    // First, create a user
    const duplicateUserData = {
      email: 'duplicate@example.com',
      name: 'First User',
      gender: 'Male',
      birthdate: '1990-01-01',
      role_id: 1,
    };

    const firstUserResponse = await supertest(web)
      .post(baseUrlTest)
      .set('Cookie', cookieHeader ?? '')
      .send(duplicateUserData);

    expect(firstUserResponse.status).toBe(200);

    // Try to create another user with the same email
    const duplicateResponse = await supertest(web)
      .post(baseUrlTest)
      .set('Cookie', cookieHeader ?? '')
      .send({
        email: 'duplicate@example.com',
        name: 'Second User',
        gender: 'Female',
        birthdate: '1995-05-05',
        role_id: 1,
      });

    expect(duplicateResponse.status).toBe(400);
    expect(duplicateResponse.body.errors).toContain(
      'The email cannot be the same!',
    );

    // ===== TEST 7: DIFFERENT GENDER VALUES =====
    console.log('🧪 Testing different gender values...');

    const genderTestCases = [
      { gender: 'Male', name: 'Male User' },
      { gender: 'Female', name: 'Female User' },
    ];

    for (const testCase of genderTestCases) {
      const genderResponse = await supertest(web)
        .post(baseUrlTest)
        .set('Cookie', cookieHeader ?? '')
        .send({
          email: `test${testCase.gender.toLowerCase()}@example.com`,
          name: testCase.name,
          gender: testCase.gender,
          birthdate: '1990-01-01',
          role_id: 1,
        });

      expect(genderResponse.status).toBe(200);
      expect(genderResponse.body.data.gender).toBe(testCase.gender);
      expect(genderResponse.body.data.name).toBe(testCase.name);
    }

    // ===== TEST 8: VARIOUS VALID BIRTHDATE FORMATS =====
    console.log('🧪 Testing various valid birthdate formats...');

    const birthdateValidTestCases = [
      { birthdate: '1990-01-01', name: 'User1990' },
      { birthdate: '2000-12-31', name: 'User2000' },
      { birthdate: '1985-06-15', name: 'User1985' },
      { birthdate: '2020-02-29', name: 'User2020' }, // Leap year
    ];

    for (const testCase of birthdateValidTestCases) {
      const birthdateValidResponse = await supertest(web)
        .post(baseUrlTest)
        .set('Cookie', cookieHeader ?? '')
        .send({
          email: `test${testCase.name}@example.com`,
          name: testCase.name,
          gender: 'Male',
          birthdate: testCase.birthdate,
          role_id: 1,
        });

      expect(birthdateValidResponse.status).toBe(200);
      expect(birthdateValidResponse.body.data.birthdate).toContain(
        testCase.birthdate,
      );
      expect(birthdateValidResponse.body.data.name).toBe(testCase.name);
    }

    // ===== TEST 9: SPECIAL CHARACTERS IN NAME FIELD =====
    console.log('🧪 Testing special characters in name field...');

    const specialCharTestCases = [
      { name: 'John-Doe', gender: 'Male' },
      { name: "O'Connor", gender: 'Male' },
      { name: 'Mary Jane', gender: 'Female' },
    ];

    for (const testCase of specialCharTestCases) {
      const specialCharResponse = await supertest(web)
        .post(baseUrlTest)
        .set('Cookie', cookieHeader ?? '')
        .send({
          email: `test${testCase.name.replace(/\s+/g, '')}@example.com`,
          name: testCase.name,
          gender: testCase.gender,
          birthdate: '1990-01-01',
          role_id: 1,
        });

      expect(specialCharResponse.status).toBe(200);
      expect(specialCharResponse.body.data.name).toBe(testCase.name);
      expect(specialCharResponse.body.data.gender).toBe(testCase.gender);
    }

    // ===== TEST 10: CONCURRENT USER CREATION =====
    console.log('🧪 Testing concurrent user creation...');

    const concurrentUserData = {
      gender: 'Male',
      birthdate: '1990-01-01',
      role_id: 1,
    };

    const promises = Array(3)
      .fill(null)
      .map((_, index) =>
        supertest(web)
          .post(baseUrlTest)
          .set('Cookie', cookieHeader ?? '')
          .send({
            ...concurrentUserData,
            email: `concurrent${index + 1}@example.com`,
            name: `ConcurrentUser${index + 1}`,
          }),
      );

    const concurrentResponses = await Promise.all(promises);

    concurrentResponses.forEach((response, index) => {
      expect(response.status).toBe(200);
      expect(response.body.data.name).toBe(`ConcurrentUser${index + 1}`);
      expect(response.body.data.email).toBe(
        `concurrent${index + 1}@example.com`,
      );
    });

    // ===== TEST 11: USER CREATION WITH EXTRA FIELDS =====
    console.log('🧪 Testing user creation with extra fields...');

    const extraFieldsData = {
      email: 'test@example.com',
      name: 'Test User',
      gender: 'Male',
      birthdate: '1990-01-01',
      role_id: 1,
      extra_field: 'should be ignored',
      another_field: 123,
      nested_field: { key: 'value' },
    };

    const extraFieldsResponse = await supertest(web)
      .post(baseUrlTest)
      .set('Cookie', cookieHeader ?? '')
      .send(extraFieldsData);

    expect(extraFieldsResponse.status).toBe(200);
    expect(extraFieldsResponse.body.data.email).toBe(extraFieldsData.email);
    expect(extraFieldsResponse.body.data.name).toBe(extraFieldsData.name);
    expect(extraFieldsResponse.body.data.gender).toBe(extraFieldsData.gender);
    expect(extraFieldsResponse.body.data.extra_field).toBeUndefined();
    expect(extraFieldsResponse.body.data.another_field).toBeUndefined();
    expect(extraFieldsResponse.body.data.nested_field).toBeUndefined();

    // ===== TEST 12: USER CREATION WITH QUERY PARAMETERS =====
    console.log('🧪 Testing user creation with query parameters...');

    const queryParamData = {
      email: 'queryparam@example.com',
      name: 'Query Param User',
      gender: 'Male',
      birthdate: '1990-01-01',
      role_id: 1,
    };

    const queryParamResponse = await supertest(web)
      .post(`${baseUrlTest}?include=extra&data=test`)
      .set('Cookie', cookieHeader ?? '')
      .send(queryParamData);

    expect(queryParamResponse.status).toBe(200);
    expect(queryParamResponse.body.data.email).toBe(queryParamData.email);
    expect(queryParamResponse.body.data.name).toBe(queryParamData.name);

    // ===== TEST 13: ROLE_ID AS STRING (FORM-URLENCODED COMPATIBILITY) =====
    console.log('🧪 Testing role_id as string (form-urlencoded compatibility)...');

    const stringRoleTestCases = [
      { role_id: '1', expectedRoleId: 1, name: 'StringRole1User' },
    ];

    for (const testCase of stringRoleTestCases) {
      const stringRoleResponse = await supertest(web)
        .post(baseUrlTest)
        .set('Cookie', cookieHeader ?? '')
        .send({
          email: `test${testCase.name}@example.com`,
          name: testCase.name,
          gender: 'Male',
          birthdate: '1990-01-01',
          role_id: testCase.role_id, // String value
        });

      expect(stringRoleResponse.status).toBe(200);
      expect(stringRoleResponse.body.data.role_id).toBe(testCase.expectedRoleId);
      expect(stringRoleResponse.body.data.name).toBe(testCase.name);
    }

    // ===== TEST 14: DIFFERENT ROLE ASSIGNMENTS =====
    console.log('🧪 Testing different role assignments...');

    const roleTestCases = [
      { role_id: 1, name: 'Role1User' },
      { role_id: 1, name: 'Role1User2' }, // Same role, different user
    ];

    for (const testCase of roleTestCases) {
      const roleResponse = await supertest(web)
        .post(baseUrlTest)
        .set('Cookie', cookieHeader ?? '')
        .send({
          email: `test${testCase.name}@example.com`,
          name: testCase.name,
          gender: 'Male',
          birthdate: '1990-01-01',
          role_id: testCase.role_id,
        });

      expect(roleResponse.status).toBe(200);
      expect(roleResponse.body.data.role_id).toBe(testCase.role_id);
      expect(roleResponse.body.data.name).toBe(testCase.name);
    }

    console.log('✅ All store user flow tests completed successfully');
  });
});
