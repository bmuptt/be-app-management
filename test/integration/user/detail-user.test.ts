import dotenv from 'dotenv';
import { AccessTokenTable, AuthLogic, UserTable } from '../../test-util';
import supertest from 'supertest';
import { web } from '../../../src/config/web';
import { logger } from '../../../src/config/logging';

dotenv.config();

const baseUrlTest = '/api/app-management/user';

describe('Detail User Business Flow', () => {
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

  it('Should successfully get user detail by ID', async () => {
    const response = await supertest(web)
      .get(`${baseUrlTest}/1`)
      .set('Cookie', cookieHeader ?? '');

    logger.debug('User detail response', response.body);
    expect(response.status).toBe(200);
    expect(response.body.data).toBeDefined();
    expect(response.body.data.id).toBe(1);
    expect(response.body.data.email).toBeDefined();
    expect(response.body.data.name).toBeDefined();
    expect(response.body.data.gender).toBeDefined();
    expect(response.body.data.birthdate).toBeDefined();
    expect(response.body.data.active).toBeDefined();
    expect(response.body.data.role_id).toBeDefined();
    expect(response.body.data.created_at).toBeDefined();
    expect(response.body.data.updated_at).toBeDefined();
    expect(response.body.data.created_by).toBeDefined();
    expect(response.body.data.updated_by).toBeDefined();
    expect(response.body.data.photo).toBeDefined();
  });

  it('Should handle non-existent user ID', async () => {
    const response = await supertest(web)
      .get(`${baseUrlTest}/999`)
      .set('Cookie', cookieHeader ?? '');

    logger.debug('Non-existent user response', response.body);
    expect(response.status).toBe(404);
    expect(response.body.errors).toContain('The user does not exist!');
  });

  it('Should handle invalid user ID format', async () => {
    const response = await supertest(web)
      .get(`${baseUrlTest}/invalid`)
      .set('Cookie', cookieHeader ?? '');

    logger.debug('Invalid user ID response', response.body);
    expect(response.status).toBe(500);
    // The error message will be from Prisma about invalid ID format
  });

  it('Should include role information in user detail', async () => {
    const response = await supertest(web)
      .get(`${baseUrlTest}/1`)
      .set('Cookie', cookieHeader ?? '');

    logger.debug('User detail with role response', response.body);
    expect(response.status).toBe(200);
    expect(response.body.data).toBeDefined();
    expect(response.body.data.role).toBeDefined();
    expect(response.body.data.role.id).toBeDefined();
    expect(response.body.data.role.name).toBeDefined();
  });

  it('Should handle zero user ID', async () => {
    const response = await supertest(web)
      .get(`${baseUrlTest}/0`)
      .set('Cookie', cookieHeader ?? '');

    logger.debug('Zero user ID response', response.body);
    expect(response.status).toBe(404);
    expect(response.body.errors).toContain('The user does not exist!');
  });

  it('Should handle negative user ID', async () => {
    const response = await supertest(web)
      .get(`${baseUrlTest}/-1`)
      .set('Cookie', cookieHeader ?? '');

    logger.debug('Negative user ID response', response.body);
    expect(response.status).toBe(404);
    expect(response.body.errors).toContain('The user does not exist!');
  });

  it('Should handle very large user ID', async () => {
    const response = await supertest(web)
      .get(`${baseUrlTest}/999999999`)
      .set('Cookie', cookieHeader ?? '');

    logger.debug('Large user ID response', response.body);
    expect(response.status).toBe(404);
    expect(response.body.errors).toContain('The user does not exist!');
  });

  it('Should return correct user data for admin user', async () => {
    const response = await supertest(web)
      .get(`${baseUrlTest}/1`)
      .set('Cookie', cookieHeader ?? '');

    logger.debug('Admin user detail response', response.body);
    expect(response.status).toBe(200);
    expect(response.body.data).toBeDefined();
    expect(response.body.data.id).toBe(1);
    expect(response.body.data.email).toBe(process.env.EMAIL_ADMIN || 'admin@gmail.com');
    expect(response.body.data.name).toBe('Admin');
  });
});
