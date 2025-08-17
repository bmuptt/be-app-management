import dotenv from 'dotenv';
import { AccessTokenTable, AuthLogic, UserTable } from '../../test-util';
import supertest from 'supertest';
import { web } from '../../../src/config/web';
import { logger } from '../../../src/config/logging';

dotenv.config();

const baseUrlTest = '/api/app-management/role';

describe('Store Role Business Flow', () => {
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

  it('Should successfully create a new role', async () => {
    const response = await supertest(web)
      .post(baseUrlTest)
      .set('Cookie', cookieHeader ?? '')
      .send({
        name: 'Test Role'
      });

    logger.debug('Store role response', response.body);
    expect(response.status).toBe(200);
    expect(response.body.message).toBe('Success to add data role.');
    expect(response.body.data).toBeDefined();
    expect(response.body.data.name).toBe('Test Role');
    expect(response.body.data.created_by).toBe(1); // Admin user ID
    expect(response.body.data.id).toBeDefined();
  });

  it('Should handle duplicate role name', async () => {
    // First create a role
    const createResponse1 = await supertest(web)
      .post(baseUrlTest)
      .set('Cookie', cookieHeader ?? '')
      .send({
        name: 'Duplicate Role'
      });

    expect(createResponse1.status).toBe(200);

    // Try to create another role with the same name
    const createResponse2 = await supertest(web)
      .post(baseUrlTest)
      .set('Cookie', cookieHeader ?? '')
      .send({
        name: 'Duplicate Role'
      });

    logger.debug('Duplicate role name response', createResponse2.body);
    expect(createResponse2.status).toBe(400);
    expect(createResponse2.body.errors).toContain('The name cannot be the same!');
  });

  it('Should handle missing name field', async () => {
    const response = await supertest(web)
      .post(baseUrlTest)
      .set('Cookie', cookieHeader ?? '')
      .send({});

    logger.debug('Missing name field response', response.body);
    expect(response.status).toBe(400);
    expect(response.body.errors).toContain('The name is required!');
  });

  it('Should handle empty name field', async () => {
    const response = await supertest(web)
      .post(baseUrlTest)
      .set('Cookie', cookieHeader ?? '')
      .send({
        name: ''
      });

    logger.debug('Empty name field response', response.body);
    expect(response.status).toBe(400);
    expect(response.body.errors).toContain('The name is required!');
  });

  it('Should handle whitespace-only name', async () => {
    const response = await supertest(web)
      .post(baseUrlTest)
      .set('Cookie', cookieHeader ?? '')
      .send({
        name: '   '
      });

    logger.debug('Whitespace-only name response', response.body);
    expect(response.status).toBe(200);
    expect(response.body.data.name).toBe('   ');
  });

  it('Should handle very long role name', async () => {
    const longName = 'A'.repeat(1000); // Very long name
    const response = await supertest(web)
      .post(baseUrlTest)
      .set('Cookie', cookieHeader ?? '')
      .send({
        name: longName
      });

    logger.debug('Very long role name response', response.body);
    expect(response.status).toBe(500);
    expect(response.body.errors).toBeDefined();
  });

  it('Should handle special characters in role name', async () => {
    const specialName = 'Role with @#$%^&*()_+-=[]{}|;:,.<>?';
    const response = await supertest(web)
      .post(baseUrlTest)
      .set('Cookie', cookieHeader ?? '')
      .send({
        name: specialName
      });

    logger.debug('Special characters in role name response', response.body);
    expect(response.status).toBe(200);
    expect(response.body.data.name).toBe(specialName);
  });

  it('Should handle Unicode characters in role name', async () => {
    const unicodeName = 'Rôle avec caractères spéciaux 角色 役割';
    const response = await supertest(web)
      .post(baseUrlTest)
      .set('Cookie', cookieHeader ?? '')
      .send({
        name: unicodeName
      });

    logger.debug('Unicode characters in role name response', response.body);
    expect(response.status).toBe(200);
    expect(response.body.data.name).toBe(unicodeName);
  });

  it('Should handle multiple role creation', async () => {
    const roles = ['Role 1', 'Role 2', 'Role 3'];
    
    for (const roleName of roles) {
      const response = await supertest(web)
        .post(baseUrlTest)
        .set('Cookie', cookieHeader ?? '')
        .send({
          name: roleName
        });

      expect(response.status).toBe(200);
      expect(response.body.data.name).toBe(roleName);
    }
  });

  it('Should return correct response structure', async () => {
    const response = await supertest(web)
      .post(baseUrlTest)
      .set('Cookie', cookieHeader ?? '')
      .send({
        name: 'Test Role Structure'
      });

    logger.debug('Response structure test', response.body);
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('message');
    expect(response.body).toHaveProperty('data');
    expect(response.body.message).toBe('Success to add data role.');
    expect(response.body.data).toHaveProperty('id');
    expect(response.body.data).toHaveProperty('name');
    expect(response.body.data).toHaveProperty('created_by');
    expect(response.body.data).toHaveProperty('created_at');
    expect(response.body.data).toHaveProperty('updated_by');
    expect(response.body.data).toHaveProperty('updated_at');
  });

  it('Should handle case-sensitive duplicate detection', async () => {
    // First create a role
    const createResponse1 = await supertest(web)
      .post(baseUrlTest)
      .set('Cookie', cookieHeader ?? '')
      .send({
        name: 'Test Role'
      });

    expect(createResponse1.status).toBe(200);

    // Try to create another role with different case
    const createResponse2 = await supertest(web)
      .post(baseUrlTest)
      .set('Cookie', cookieHeader ?? '')
      .send({
        name: 'test role'
      });

    logger.debug('Case-sensitive duplicate response', createResponse2.body);
    expect(createResponse2.status).toBe(200);
    expect(createResponse2.body.data.name).toBe('test role');
  });
});
