import dotenv from 'dotenv';
import { TestHelper, AuthLogic } from '../../test-util';
import supertest from 'supertest';
import { web } from '../../../src/config/web';
import { logger } from '../../../src/config/logging';

dotenv.config();

describe('Edit Profile Business Flow', () => {
  let cookieHeader: string | null;

  beforeEach(async () => {
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

  it('Should handle complete edit profile flow including validation, data updates, and edge cases', async () => {
    // ===== TEST 1: SUCCESSFUL PROFILE EDIT =====
    console.log('🧪 Testing successful profile edit...');
    
    const updateData = {
      name: 'Updated Admin Name',
      gender: 'Male',
      birthdate: '1990-01-01'
    };

    const response = await supertest(web)
      .patch('/api/edit-profile')
      .set('Cookie', cookieHeader ?? '')
      .send(updateData);

    expect(response.status).toBe(200);
    expect(response.body.message).toBe('Success to edit data user.');
    expect(response.body.data).toBeDefined();
    expect(response.body.data.name).toBe(updateData.name);
    expect(response.body.data.gender).toBe(updateData.gender);
    expect(response.body.data.birthdate).toContain(updateData.birthdate);
    expect(response.body.data.email).toBe(process.env.EMAIL_ADMIN);

    // ===== TEST 2: VALIDATION ERRORS =====
    console.log('🧪 Testing validation errors...');
    
    const validationTestCases = [
      { 
        data: {}, 
        expectedErrors: ['The name is required!', 'The gender is required!', 'The birthdate is required!'] 
      },
      { 
        data: { name: 'Test Name' }, 
        expectedErrors: ['The gender is required!', 'The birthdate is required!'] 
      },
      { 
        data: { name: 'Test Name', gender: 'Male' }, 
        expectedErrors: ['The birthdate is required!'] 
      },
      { 
        data: { name: '', gender: 'Male', birthdate: '1990-01-01' }, 
        expectedErrors: ['The name must be at least 2 characters!'] 
      },
      { 
        data: { name: 'Test Name', gender: '', birthdate: '1990-01-01' }, 
        expectedErrors: ['The gender is required!'] 
      },
      { 
        data: { name: 'Test Name', gender: 'Male', birthdate: '' }, 
        expectedErrors: ['The birthdate format must be: YYYY-MM-DD!'] 
      },
    ];

    for (const testCase of validationTestCases) {
      const response = await supertest(web)
        .patch('/api/edit-profile')
        .set('Cookie', cookieHeader ?? '')
        .send(testCase.data);

      expect(response.status).toBe(400);
      expect(response.body.errors).toEqual(expect.arrayContaining(testCase.expectedErrors));
    }

    // ===== TEST 3: BIRTHDATE VALIDATION =====
    console.log('🧪 Testing birthdate validation...');
    
    const birthdateTestCases = [
      { birthdate: 'invalid-date', expectedError: 'The birthdate format must be: YYYY-MM-DD!' },
      { birthdate: '1990/01/01', expectedError: 'The birthdate format must be: YYYY-MM-DD!' },
      { birthdate: '01-01-1990', expectedError: 'The birthdate format must be: YYYY-MM-DD!' },
      { birthdate: '1990-13-01', expectedError: 'The birthdate format must be: YYYY-MM-DD!' },
      { birthdate: '1990-01-32', expectedError: 'The birthdate format must be: YYYY-MM-DD!' },
      { birthdate: '1990-00-01', expectedError: 'The birthdate format must be: YYYY-MM-DD!' },
      { birthdate: '1990-01-00', expectedError: 'The birthdate format must be: YYYY-MM-DD!' },
    ];

    for (const testCase of birthdateTestCases) {
      const response = await supertest(web)
        .patch('/api/edit-profile')
        .set('Cookie', cookieHeader ?? '')
        .send({
          name: 'Test Name',
          gender: 'Male',
          birthdate: testCase.birthdate
        });

      expect(response.status).toBe(400);
      expect(response.body.errors).toContain(testCase.expectedError);
    }

    // ===== TEST 4: GENDER VALIDATION =====
    console.log('🧪 Testing gender validation...');
    
    const genderTestCases = [
      { gender: 'Invalid', expectedError: 'Gender must be either \'Male\' or \'Female\'!' },
      { gender: 'male', expectedError: 'Gender must be either \'Male\' or \'Female\'!' },
      { gender: 'female', expectedError: 'Gender must be either \'Male\' or \'Female\'!' },
      { gender: 'M', expectedError: 'Gender must be either \'Male\' or \'Female\'!' },
      { gender: 'F', expectedError: 'Gender must be either \'Male\' or \'Female\'!' },
      { gender: '1', expectedError: 'Gender must be either \'Male\' or \'Female\'!' },
      { gender: '0', expectedError: 'Gender must be either \'Male\' or \'Female\'!' },
    ];

    for (const testCase of genderTestCases) {
      const response = await supertest(web)
        .patch('/api/edit-profile')
        .set('Cookie', cookieHeader ?? '')
        .send({
          name: 'Test Name',
          gender: testCase.gender,
          birthdate: '1990-01-01'
        });

      expect(response.status).toBe(400);
      expect(response.body.errors).toContain(testCase.expectedError);
    }

    // ===== TEST 5: NAME LENGTH VALIDATION =====
    console.log('🧪 Testing name length validation...');
    
    const nameLengthTestCases = [
      { name: '', expectedError: 'The name must be at least 2 characters!' },
      { name: 'A', expectedError: 'The name must be at least 2 characters!' },
      { name: 'a'.repeat(101), expectedError: 'The name cannot exceed 100 characters!' },
    ];

    for (const testCase of nameLengthTestCases) {
      const response = await supertest(web)
        .patch('/api/edit-profile')
        .set('Cookie', cookieHeader ?? '')
        .send({
          name: testCase.name,
          gender: 'Male',
          birthdate: '1990-01-01'
        });

      expect(response.status).toBe(400);
      expect(response.body.errors).toContain(testCase.expectedError);
    }

    // ===== TEST 6: EMAIL PROTECTION =====
    console.log('🧪 Testing email protection...');
    
    const originalEmail = process.env.EMAIL_ADMIN;
    const emailProtectionData = {
      name: 'Updated Admin Name',
      gender: 'Male',
      birthdate: '1990-01-01',
      email: 'newemail@example.com'
    };

    const emailResponse = await supertest(web)
      .patch('/api/edit-profile')
      .set('Cookie', cookieHeader ?? '')
      .send(emailProtectionData);

    expect(emailResponse.status).toBe(200);
    expect(emailResponse.body.data.email).toBe(originalEmail);
    expect(emailResponse.body.data.name).toBe(emailProtectionData.name);

    // ===== TEST 7: VALID GENDER VALUES =====
    console.log('🧪 Testing valid gender values...');
    
    const validGenderTestCases = [
      { gender: 'Male', name: 'Male User' },
      { gender: 'Female', name: 'Female User' },
    ];

    for (const testCase of validGenderTestCases) {
      const response = await supertest(web)
        .patch('/api/edit-profile')
        .set('Cookie', cookieHeader ?? '')
        .send({
          name: testCase.name,
          gender: testCase.gender,
          birthdate: '1990-01-01'
        });

      expect(response.status).toBe(200);
      expect(response.body.data.gender).toBe(testCase.gender);
      expect(response.body.data.name).toBe(testCase.name);
    }

    // ===== TEST 8: VALID BIRTHDATE FORMATS =====
    console.log('🧪 Testing valid birthdate formats...');
    
    const validBirthdateTestCases = [
      { birthdate: '1990-01-01', name: 'User1990' },
      { birthdate: '2000-12-31', name: 'User2000' },
      { birthdate: '1985-06-15', name: 'User1985' },
      { birthdate: '2020-02-29', name: 'User2020' }, // Leap year
    ];

    for (const testCase of validBirthdateTestCases) {
      const response = await supertest(web)
        .patch('/api/edit-profile')
        .set('Cookie', cookieHeader ?? '')
        .send({
          name: testCase.name,
          gender: 'Male',
          birthdate: testCase.birthdate
        });

      expect(response.status).toBe(200);
      expect(response.body.data.birthdate).toContain(testCase.birthdate);
      expect(response.body.data.name).toBe(testCase.name);
    }

    // ===== TEST 9: SPECIAL CHARACTERS IN NAME =====
    console.log('🧪 Testing special characters in name...');
    
    const specialCharTestCases = [
      { name: 'John-Doe', gender: 'Male' },
      { name: "O'Connor", gender: 'Male' },
      { name: 'Mary Jane', gender: 'Female' },
    ];

    for (const testCase of specialCharTestCases) {
      const response = await supertest(web)
        .patch('/api/edit-profile')
        .set('Cookie', cookieHeader ?? '')
        .send({
          name: testCase.name,
          gender: testCase.gender,
          birthdate: '1990-01-01'
        });

      expect(response.status).toBe(200);
      expect(response.body.data.name).toBe(testCase.name);
      expect(response.body.data.gender).toBe(testCase.gender);
    }

    // ===== TEST 10: CONCURRENT REQUESTS =====
    console.log('🧪 Testing concurrent requests...');
    
    const concurrentUpdateData = {
      name: 'Concurrent Test User',
      gender: 'Male',
      birthdate: '1990-01-01'
    };

    const promises = Array(3).fill(null).map((_, index) =>
      supertest(web)
        .patch('/api/edit-profile')
        .set('Cookie', cookieHeader ?? '')
        .send({
          ...concurrentUpdateData,
          name: `ConcurrentUser${index + 1}`
        })
    );

    const concurrentResponses = await Promise.all(promises);

    concurrentResponses.forEach((response, index) => {
      expect(response.status).toBe(200);
      expect(response.body.data.name).toBe(`ConcurrentUser${index + 1}`);
      expect(response.body.data.gender).toBe(concurrentUpdateData.gender);
    });

    // ===== TEST 11: EXTRA FIELDS IGNORED =====
    console.log('🧪 Testing extra fields ignored...');
    
    const extraFieldsData = {
      name: 'Test User',
      gender: 'Male',
      birthdate: '1990-01-01',
      extra_field: 'should be ignored',
      another_field: 123,
      nested_field: { key: 'value' }
    };

    const extraFieldsResponse = await supertest(web)
      .patch('/api/edit-profile')
      .set('Cookie', cookieHeader ?? '')
      .send(extraFieldsData);

    expect(extraFieldsResponse.status).toBe(200);
    expect(extraFieldsResponse.body.data.name).toBe(extraFieldsData.name);
    expect(extraFieldsResponse.body.data.gender).toBe(extraFieldsData.gender);
    expect(extraFieldsResponse.body.data.birthdate).toContain(extraFieldsData.birthdate);
    expect(extraFieldsResponse.body.data.extra_field).toBeUndefined();
    expect(extraFieldsResponse.body.data.another_field).toBeUndefined();
    expect(extraFieldsResponse.body.data.nested_field).toBeUndefined();

    // ===== TEST 12: QUERY PARAMETERS IGNORED =====
    console.log('🧪 Testing query parameters ignored...');
    
    const queryParamData = {
      name: 'Test User',
      gender: 'Male',
      birthdate: '1990-01-01'
    };

    const queryParamResponse = await supertest(web)
      .patch('/api/edit-profile?include=extra&data=test')
      .set('Cookie', cookieHeader ?? '')
      .send(queryParamData);

    expect(queryParamResponse.status).toBe(200);
    expect(queryParamResponse.body.data.name).toBe(queryParamData.name);
    expect(queryParamResponse.body.data.gender).toBe(queryParamData.gender);

    console.log('✅ All edit profile flow tests completed successfully');
  });
});
