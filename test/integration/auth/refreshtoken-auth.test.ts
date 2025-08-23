import dotenv from 'dotenv';
import { TestHelper, AuthLogic } from '../../test-util';
import supertest from 'supertest';
import { web } from '../../../src/config/web';
import { logger } from '../../../src/config/logging';

dotenv.config();

describe('Refresh Token Authentication', () => {
  let refresh_token: string | null;
  let cookieHeader: string | null;

  beforeEach(async () => {
    // Migrate dan seed ulang database untuk setiap test case
    await TestHelper.refreshDatabase();

    const responseLogin = await AuthLogic.getLoginSuperAdmin();
    expect(responseLogin.status).toBe(200);

    const cookies = responseLogin.headers['set-cookie'];
    refresh_token = responseLogin.body.refresh_token;
    cookieHeader = Array.isArray(cookies) ? cookies.join('; ') : cookies;
  });

  afterEach(async () => {
    // Cleanup database setelah test
    await TestHelper.cleanupDatabase();
  });

  it('Should handle complete refresh token flow including validation, success cases, and edge cases', async () => {
    // ===== TEST 1: SUCCESSFUL REFRESH TOKEN =====
    console.log('🧪 Testing successful refresh token...');
    
    const response = await supertest(web)
      .post('/api/refresh-token')
      .send({
        refresh_token,
      });

    expect(response.status).toBe(200);
    expect(response.body.message).toBe('Login successful');
    expect(response.body.refresh_token).toBeDefined();
    expect(response.body.user).toBeDefined();
    expect(response.body.user.email).toBe(process.env.EMAIL_ADMIN);
    expect(response.body.user.password).toBeUndefined();
    expect(response.headers['set-cookie']).toBeDefined();

    // ===== TEST 2: VALIDATION ERRORS =====
    console.log('🧪 Testing validation errors...');
    
    const validationTestCases = [
      { data: {}, expectedError: 'Refresh token not found' },
      { data: { refresh_token: '' }, expectedError: 'Refresh token not found' },
      { data: { refresh_token: null }, expectedError: 'Refresh token not found' },
      { data: { refresh_token: 'invalid_token_format' }, expectedError: 'Refresh token not found' },
      { data: { refresh_token: 'token_with_special_chars!@#$%^&*()' }, expectedError: 'Refresh token not found' },
      { data: { refresh_token: 'a'.repeat(1000) }, expectedError: 'Refresh token not found' },
      { data: { refresh_token: '   ' }, expectedError: 'Refresh token not found' },
    ];

    for (const testCase of validationTestCases) {
      const response = await supertest(web)
        .post('/api/refresh-token')
        .send(testCase.data);

      expect(response.status).toBe(403);
      expect(response.body.errors).toContain(testCase.expectedError);
    }

    // ===== TEST 3: TOKEN REUSE PROTECTION =====
    console.log('🧪 Testing token reuse protection...');
    
    // Get a fresh refresh token for this test
    const freshLoginResponse = await AuthLogic.getLoginSuperAdmin();
    const freshRefreshToken = freshLoginResponse.body.refresh_token;
    
    // First refresh - should succeed
    const firstResponse = await supertest(web)
      .post('/api/refresh-token')
      .send({
        refresh_token: freshRefreshToken,
      });

    expect(firstResponse.status).toBe(200);

    // Second refresh with same token - should fail
    const secondResponse = await supertest(web)
      .post('/api/refresh-token')
      .send({
        refresh_token: freshRefreshToken,
      });

    expect(secondResponse.status).toBe(403);
    expect(secondResponse.body.errors).toContain('Refresh token not found');

    // ===== TEST 4: HTTP METHODS =====
    console.log('🧪 Testing HTTP methods...');
    
    const httpMethods = ['get', 'put', 'delete', 'patch'];
    for (const method of httpMethods) {
      const response = await supertest(web)[method]('/api/refresh-token')
        .send({
          refresh_token,
        });

      expect(response.status).toBe(404);
    }

    // ===== TEST 5: EXTRA FIELDS AND PARAMETERS =====
    console.log('🧪 Testing extra fields and parameters...');
    
    // Get fresh refresh token for this test
    const extraFieldsLoginResponse = await AuthLogic.getLoginSuperAdmin();
    const extraFieldsRefreshToken = extraFieldsLoginResponse.body.refresh_token;
    
    // Test with extra fields
    const extraFieldsResponse = await supertest(web)
      .post('/api/refresh-token')
      .send({
        refresh_token: extraFieldsRefreshToken,
        extra_field: 'should be ignored',
        another_field: 123,
        nested_field: { key: 'value' },
      });

    expect(extraFieldsResponse.status).toBe(200);
    expect(extraFieldsResponse.body.message).toBe('Login successful');
    expect(extraFieldsResponse.body.refresh_token).toBeDefined();
    expect(extraFieldsResponse.body.user).toBeDefined();

    // Get fresh refresh token for query parameters test
    const queryParamLoginResponse = await AuthLogic.getLoginSuperAdmin();
    const queryParamRefreshToken = queryParamLoginResponse.body.refresh_token;
    
    // Test with query parameters
    const queryParamResponse = await supertest(web)
      .post('/api/refresh-token?include=extra&data=test')
      .send({
        refresh_token: queryParamRefreshToken,
      });

    expect(queryParamResponse.status).toBe(200);
    expect(queryParamResponse.body.message).toBe('Login successful');
    expect(queryParamResponse.body.refresh_token).toBeDefined();
    expect(queryParamResponse.body.user).toBeDefined();

    // ===== TEST 6: ADDITIONAL HEADERS =====
    console.log('🧪 Testing additional headers...');
    
    // Get fresh refresh token for headers test
    const headerLoginResponse = await AuthLogic.getLoginSuperAdmin();
    const headerRefreshToken = headerLoginResponse.body.refresh_token;
    
    const headerResponse = await supertest(web)
      .post('/api/refresh-token')
      .set('User-Agent', 'Test-Agent')
      .set('Accept', 'application/json')
      .set('Content-Type', 'application/json')
      .send({
        refresh_token: headerRefreshToken,
      });

    expect(headerResponse.status).toBe(200);
    expect(headerResponse.body.message).toBe('Login successful');
    expect(headerResponse.body.refresh_token).toBeDefined();
    expect(headerResponse.body.user).toBeDefined();

    // ===== TEST 7: LOGOUT INTEGRATION =====
    console.log('🧪 Testing logout integration...');
    
    // Get fresh login for logout test
    const logoutLoginResponse = await AuthLogic.getLoginSuperAdmin();
    const logoutRefreshToken = logoutLoginResponse.body.refresh_token;
    const logoutCookies = logoutLoginResponse.headers['set-cookie'];
    const logoutCookieHeader = Array.isArray(logoutCookies) ? logoutCookies.join('; ') : logoutCookies;
    
    // First, logout the user
    const logoutResponse = await supertest(web)
      .post('/api/logout')
      .set('Cookie', logoutCookieHeader ?? '');

    expect(logoutResponse.status).toBe(200);

    // Then try to refresh token - should fail because logout invalidates the refresh token
    const refreshAfterLogoutResponse = await supertest(web)
      .post('/api/refresh-token')
      .send({
        refresh_token: logoutRefreshToken,
      });

    expect(refreshAfterLogoutResponse.status).toBe(403);
    expect(refreshAfterLogoutResponse.body.errors).toContain('Refresh token not found');

    console.log('✅ All refresh token flow tests completed successfully');
  });
});
