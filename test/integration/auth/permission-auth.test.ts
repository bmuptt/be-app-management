import dotenv from 'dotenv';
import { AccessTokenTable, AuthLogic, UserTable } from '../../test-util';
import supertest from 'supertest';
import { web } from '../../../src/config/web';
import { logger } from '../../../src/config/logging';

dotenv.config();

const baseUrlTest = '/api/permission';

describe('Permission Auth Business Flow', () => {
  let cookies: string | string[];
  let cookieHeader: string | null;

  beforeEach(async () => {
    await UserTable.delete();
    await AccessTokenTable.delete();
    await UserTable.resetUserIdSequence();
    await AccessTokenTable.resetAccessTokenIdSequence();
    await UserTable.callUserSeed();

    const responseLogin = await AuthLogic.getLoginSuperAdmin();
    expect(responseLogin.status).toBe(200);

    cookies = responseLogin.headers['set-cookie'];
    cookieHeader = Array.isArray(cookies) ? cookies.join('; ') : cookies;
  }, 30000);

  afterEach(async () => {
    await UserTable.delete();
    await AccessTokenTable.delete();
  });

  it('Should return 401 when accessing permission without authentication', async () => {
    const response = await supertest(web).get(baseUrlTest);

    logger.debug('Permission without auth response', response.body);
    expect(response.status).toBe(401);
  });

  it('Should return 400 when key_menu parameter is missing', async () => {
    const response = await supertest(web)
      .get(baseUrlTest)
      .set('Cookie', cookieHeader ?? '');

    logger.debug('Permission missing key_menu response', response.body);
    expect(response.body.errors).toEqual(
      expect.arrayContaining(['The key menu is required!'])
    );
    expect(response.status).toBe(400);
  });

  it('Should return 400 when key_menu parameter is empty', async () => {
    const response = await supertest(web)
      .get(`${baseUrlTest}?key_menu=`)
      .set('Cookie', cookieHeader ?? '');

    logger.debug('Permission empty key_menu response', response.body);
    expect(response.body.errors).toEqual(
      expect.arrayContaining(['The key menu is required!'])
    );
    expect(response.status).toBe(400);
  });

  it('Should return default permissions when menu does not exist', async () => {
    const response = await supertest(web)
      .get(`${baseUrlTest}?key_menu=nonexistent_menu`)
      .set('Cookie', cookieHeader ?? '');

    logger.debug('Permission nonexistent menu response', response.body);
    expect(response.status).toBe(200);
    expect(response.body.data).toEqual({
      access: false,
      create: false,
      update: false,
      delete: false,
      approve1: false,
      approve2: false,
      approve3: false,
    });
  });

  it('Should return correct permissions for existing menu with role', async () => {
    const response = await supertest(web)
      .get(`${baseUrlTest}?key_menu=user`)
      .set('Cookie', cookieHeader ?? '');

    logger.debug('Permission with role response', response.body);
    expect(response.status).toBe(200);
    expect(response.body.data.access).toBe(true);
    expect(response.body.data.create).toBe(true);
    expect(response.body.message).toBe('Success to get permission.');
  });

  it('Should return correct permissions for different menu keys', async () => {
    // Test with different menu keys
    const testCases = [
      { key_menu: 'user', expectedAccess: true },
      { key_menu: 'role', expectedAccess: true },
      { key_menu: 'menu', expectedAccess: true },
      { key_menu: 'nonexistent', expectedAccess: false },
    ];

    for (const testCase of testCases) {
      const response = await supertest(web)
        .get(`${baseUrlTest}?key_menu=${testCase.key_menu}`)
        .set('Cookie', cookieHeader ?? '');

      logger.debug(`Permission for ${testCase.key_menu}`, response.body);
      expect(response.status).toBe(200);
      expect(response.body.data.access).toBe(testCase.expectedAccess);
    }
  });

  it('Should return success message in response', async () => {
    const response = await supertest(web)
      .get(`${baseUrlTest}?key_menu=user`)
      .set('Cookie', cookieHeader ?? '');

    logger.debug('Permission success message response', response.body);
    expect(response.status).toBe(200);
    expect(response.body.message).toBe('Success to get permission.');
    expect(response.body.data).toBeDefined();
  });
});
