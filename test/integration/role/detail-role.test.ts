import dotenv from 'dotenv';
import { AccessTokenTable, AuthLogic, UserTable } from '../../test-util';
import supertest from 'supertest';
import { web } from '../../../src/config/web';
import { logger } from '../../../src/config/logging';

dotenv.config();

const baseUrlTest = '/api/app-management/role';

describe('Detail Role Business Flow', () => {
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

  it('Should successfully get role detail for existing role', async () => {
    // First create a role to get its ID
    const createResponse = await supertest(web)
      .post(baseUrlTest)
      .set('Cookie', cookieHeader ?? '')
      .send({
        name: 'Test Role for Detail'
      });

    expect(createResponse.status).toBe(200);
    const roleId = createResponse.body.data.id;

    // Get role detail
    const response = await supertest(web)
      .get(`${baseUrlTest}/${roleId}`)
      .set('Cookie', cookieHeader ?? '');

    logger.debug('Detail role response', response.body);
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('data');
    expect(response.body.data.id).toBe(roleId);
    expect(response.body.data.name).toBe('Test Role for Detail');
    expect(response.body.data).toHaveProperty('created_by');
    expect(response.body.data).toHaveProperty('created_at');
    expect(response.body.data).toHaveProperty('updated_by');
    expect(response.body.data).toHaveProperty('updated_at');
  });

  it('Should handle non-existent role ID', async () => {
    const response = await supertest(web)
      .get(`${baseUrlTest}/999999`)
      .set('Cookie', cookieHeader ?? '');

    logger.debug('Non-existent role detail response', response.body);
    expect(response.status).toBe(404);
    expect(response.body.errors).toContain('The role does not exist!');
  });

  it('Should handle invalid role ID format', async () => {
    const response = await supertest(web)
      .get(`${baseUrlTest}/invalid`)
      .set('Cookie', cookieHeader ?? '');

    logger.debug('Invalid role ID format response', response.body);
    expect(response.status).toBe(500);
    // Invalid ID format causes database error
    expect(response.body.errors).toBeDefined();
  });

  it('Should handle negative role ID', async () => {
    const response = await supertest(web)
      .get(`${baseUrlTest}/-1`)
      .set('Cookie', cookieHeader ?? '');

    logger.debug('Negative role ID response', response.body);
    expect(response.status).toBe(404);
    expect(response.body.errors).toContain('The role does not exist!');
  });

  it('Should handle zero role ID', async () => {
    const response = await supertest(web)
      .get(`${baseUrlTest}/0`)
      .set('Cookie', cookieHeader ?? '');

    logger.debug('Zero role ID response', response.body);
    expect(response.status).toBe(404);
    expect(response.body.errors).toContain('The role does not exist!');
  });

  it('Should return correct response structure', async () => {
    // First create a role to get its ID
    const createResponse = await supertest(web)
      .post(baseUrlTest)
      .set('Cookie', cookieHeader ?? '')
      .send({
        name: 'Test Role Structure'
      });

    expect(createResponse.status).toBe(200);
    const roleId = createResponse.body.data.id;

    // Get role detail
    const response = await supertest(web)
      .get(`${baseUrlTest}/${roleId}`)
      .set('Cookie', cookieHeader ?? '');

    logger.debug('Response structure test', response.body);
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('data');
    expect(response.body.data).toHaveProperty('id');
    expect(response.body.data).toHaveProperty('name');
    expect(response.body.data).toHaveProperty('created_by');
    expect(response.body.data).toHaveProperty('created_at');
    expect(response.body.data).toHaveProperty('updated_by');
    expect(response.body.data).toHaveProperty('updated_at');
  });

  it('Should handle very large role ID', async () => {
    const response = await supertest(web)
      .get(`${baseUrlTest}/999999999999`)
      .set('Cookie', cookieHeader ?? '');

    logger.debug('Very large role ID response', response.body);
    expect(response.status).toBe(500);
    // Very large ID causes database integer overflow error
    expect(response.body.errors).toBeDefined();
  });

  it('Should handle decimal role ID', async () => {
    const response = await supertest(web)
      .get(`${baseUrlTest}/1.5`)
      .set('Cookie', cookieHeader ?? '');

    logger.debug('Decimal role ID response', response.body);
    expect(response.status).toBe(200);
    // parseInt(1.5) returns 1, which finds the Super Admin role
    expect(response.body.data.id).toBe(1);
  });

  it('Should handle multiple role detail requests', async () => {
    // Create multiple roles
    const roles = ['Role 1', 'Role 2', 'Role 3'];
    const roleIds: number[] = [];

    for (const roleName of roles) {
      const createResponse = await supertest(web)
        .post(baseUrlTest)
        .set('Cookie', cookieHeader ?? '')
        .send({
          name: roleName
        });

      expect(createResponse.status).toBe(200);
      roleIds.push(createResponse.body.data.id);
    }

    // Get details for all roles
    for (let i = 0; i < roleIds.length; i++) {
      const response = await supertest(web)
        .get(`${baseUrlTest}/${roleIds[i]}`)
        .set('Cookie', cookieHeader ?? '');

      expect(response.status).toBe(200);
      expect(response.body.data.id).toBe(roleIds[i]);
      expect(response.body.data.name).toBe(roles[i]);
    }
  });
});
