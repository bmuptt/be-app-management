import dotenv from 'dotenv';
import { AccessTokenTable, AuthLogic, UserTable } from '../../test-util';
import supertest from 'supertest';
import { web } from '../../../src/config/web';
import { logger } from '../../../src/config/logging';

dotenv.config();

const baseUrlTest = '/api/app-management/role';

describe('Update Role Business Flow', () => {
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

  it('Should successfully update role name', async () => {
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

    logger.debug('Update role response', response.body);
    expect(response.status).toBe(200);
    expect(response.body.message).toBe('Success to edit data role.');
    expect(response.body.data).toBeDefined();
    expect(response.body.data.id).toBe(roleId);
    expect(response.body.data.name).toBe('Updated Role Name');
    expect(response.body.data.updated_by).toBe(1); // Admin user ID
  });

  it('Should handle duplicate role name during update', async () => {
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
    const response = await supertest(web)
      .patch(`${baseUrlTest}/${roleId2}`)
      .set('Cookie', cookieHeader ?? '')
      .send({
        name: 'First Role'
      });

    logger.debug('Duplicate name update response', response.body);
    expect(response.status).toBe(400);
    expect(response.body.errors).toContain('The name cannot be the same!');
  });

  it('Should handle non-existent role ID', async () => {
    const response = await supertest(web)
      .patch(`${baseUrlTest}/999999`)
      .set('Cookie', cookieHeader ?? '')
      .send({
        name: 'Updated Name'
      });

    logger.debug('Non-existent role update response', response.body);
    expect(response.status).toBe(404);
    expect(response.body.errors).toContain('The role does not exist!');
  });

  it('Should handle missing name field', async () => {
    // First create a role
    const createResponse = await supertest(web)
      .post(baseUrlTest)
      .set('Cookie', cookieHeader ?? '')
      .send({
        name: 'Test Role'
      });

    expect(createResponse.status).toBe(200);
    const roleId = createResponse.body.data.id;

    // Try to update without name
    const response = await supertest(web)
      .patch(`${baseUrlTest}/${roleId}`)
      .set('Cookie', cookieHeader ?? '')
      .send({});

    logger.debug('Missing name field update response', response.body);
    expect(response.status).toBe(400);
    expect(response.body.errors).toContain('The name is required!');
  });

  it('Should handle empty name field', async () => {
    // First create a role
    const createResponse = await supertest(web)
      .post(baseUrlTest)
      .set('Cookie', cookieHeader ?? '')
      .send({
        name: 'Test Role'
      });

    expect(createResponse.status).toBe(200);
    const roleId = createResponse.body.data.id;

    // Try to update with empty name
    const response = await supertest(web)
      .patch(`${baseUrlTest}/${roleId}`)
      .set('Cookie', cookieHeader ?? '')
      .send({
        name: ''
      });

    logger.debug('Empty name field update response', response.body);
    expect(response.status).toBe(400);
    expect(response.body.errors).toContain('The name is required!');
  });

  it('Should handle whitespace-only name', async () => {
    // First create a role
    const createResponse = await supertest(web)
      .post(baseUrlTest)
      .set('Cookie', cookieHeader ?? '')
      .send({
        name: 'Test Role'
      });

    expect(createResponse.status).toBe(200);
    const roleId = createResponse.body.data.id;

    // Update with whitespace-only name
    const response = await supertest(web)
      .patch(`${baseUrlTest}/${roleId}`)
      .set('Cookie', cookieHeader ?? '')
      .send({
        name: '   '
      });

    logger.debug('Whitespace-only name update response', response.body);
    expect(response.status).toBe(200);
    expect(response.body.data.name).toBe('   ');
  });

  it('Should handle very long role name', async () => {
    // First create a role
    const createResponse = await supertest(web)
      .post(baseUrlTest)
      .set('Cookie', cookieHeader ?? '')
      .send({
        name: 'Test Role'
      });

    expect(createResponse.status).toBe(200);
    const roleId = createResponse.body.data.id;

    // Update with very long name
    const longName = 'A'.repeat(1000);
    const response = await supertest(web)
      .patch(`${baseUrlTest}/${roleId}`)
      .set('Cookie', cookieHeader ?? '')
      .send({
        name: longName
      });

    logger.debug('Very long role name update response', response.body);
    expect(response.status).toBe(500);
    expect(response.body.errors).toBeDefined();
  });

  it('Should handle special characters in role name', async () => {
    // First create a role
    const createResponse = await supertest(web)
      .post(baseUrlTest)
      .set('Cookie', cookieHeader ?? '')
      .send({
        name: 'Test Role'
      });

    expect(createResponse.status).toBe(200);
    const roleId = createResponse.body.data.id;

    // Update with special characters
    const specialName = 'Role with @#$%^&*()_+-=[]{}|;:,.<>?';
    const response = await supertest(web)
      .patch(`${baseUrlTest}/${roleId}`)
      .set('Cookie', cookieHeader ?? '')
      .send({
        name: specialName
      });

    logger.debug('Special characters in role name update response', response.body);
    expect(response.status).toBe(200);
    expect(response.body.data.name).toBe(specialName);
  });

  it('Should handle Unicode characters in role name', async () => {
    // First create a role
    const createResponse = await supertest(web)
      .post(baseUrlTest)
      .set('Cookie', cookieHeader ?? '')
      .send({
        name: 'Test Role'
      });

    expect(createResponse.status).toBe(200);
    const roleId = createResponse.body.data.id;

    // Update with Unicode characters
    const unicodeName = 'Rôle avec caractères spéciaux 角色 役割';
    const response = await supertest(web)
      .patch(`${baseUrlTest}/${roleId}`)
      .set('Cookie', cookieHeader ?? '')
      .send({
        name: unicodeName
      });

    logger.debug('Unicode characters in role name update response', response.body);
    expect(response.status).toBe(200);
    expect(response.body.data.name).toBe(unicodeName);
  });

  it('Should handle invalid role ID format', async () => {
    const response = await supertest(web)
      .patch(`${baseUrlTest}/invalid`)
      .set('Cookie', cookieHeader ?? '')
      .send({
        name: 'Updated Name'
      });

    logger.debug('Invalid role ID format update response', response.body);
    expect(response.status).toBe(500);
    // Invalid ID format causes database error
    expect(response.body.errors).toBeDefined();
  });

  it('Should handle negative role ID', async () => {
    const response = await supertest(web)
      .patch(`${baseUrlTest}/-1`)
      .set('Cookie', cookieHeader ?? '')
      .send({
        name: 'Updated Name'
      });

    logger.debug('Negative role ID update response', response.body);
    expect(response.status).toBe(404);
    expect(response.body.errors).toContain('The role does not exist!');
  });

  it('Should handle zero role ID', async () => {
    const response = await supertest(web)
      .patch(`${baseUrlTest}/0`)
      .set('Cookie', cookieHeader ?? '')
      .send({
        name: 'Updated Name'
      });

    logger.debug('Zero role ID update response', response.body);
    expect(response.status).toBe(404);
    expect(response.body.errors).toContain('The role does not exist!');
  });

  it('Should handle case-sensitive duplicate detection', async () => {
    // Create first role
    const createResponse1 = await supertest(web)
      .post(baseUrlTest)
      .set('Cookie', cookieHeader ?? '')
      .send({
        name: 'Test Role'
      });

    expect(createResponse1.status).toBe(200);
    const roleId1 = createResponse1.body.data.id;

    // Create second role
    const createResponse2 = await supertest(web)
      .post(baseUrlTest)
      .set('Cookie', cookieHeader ?? '')
      .send({
        name: 'Another Role'
      });

    expect(createResponse2.status).toBe(200);
    const roleId2 = createResponse2.body.data.id;

    // Try to update second role with different case of first role's name
    const response = await supertest(web)
      .patch(`${baseUrlTest}/${roleId2}`)
      .set('Cookie', cookieHeader ?? '')
      .send({
        name: 'test role'
      });

    logger.debug('Case-sensitive duplicate update response', response.body);
    expect(response.status).toBe(200);
    expect(response.body.data.name).toBe('test role');
  });

  it('Should return correct response structure', async () => {
    // First create a role
    const createResponse = await supertest(web)
      .post(baseUrlTest)
      .set('Cookie', cookieHeader ?? '')
      .send({
        name: 'Test Role'
      });

    expect(createResponse.status).toBe(200);
    const roleId = createResponse.body.data.id;

    // Update the role
    const response = await supertest(web)
      .patch(`${baseUrlTest}/${roleId}`)
      .set('Cookie', cookieHeader ?? '')
      .send({
        name: 'Updated Role Structure'
      });

    logger.debug('Response structure test', response.body);
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('message');
    expect(response.body).toHaveProperty('data');
    expect(response.body.message).toBe('Success to edit data role.');
    expect(response.body.data).toHaveProperty('id');
    expect(response.body.data).toHaveProperty('name');
    expect(response.body.data).toHaveProperty('created_by');
    expect(response.body.data).toHaveProperty('created_at');
    expect(response.body.data).toHaveProperty('updated_by');
    expect(response.body.data).toHaveProperty('updated_at');
  });

  it('Should handle multiple updates on same role', async () => {
    // First create a role
    const createResponse = await supertest(web)
      .post(baseUrlTest)
      .set('Cookie', cookieHeader ?? '')
      .send({
        name: 'Original Name'
      });

    expect(createResponse.status).toBe(200);
    const roleId = createResponse.body.data.id;

    // Update multiple times
    const updates = ['First Update', 'Second Update', 'Final Update'];
    
    for (const updateName of updates) {
      const response = await supertest(web)
        .patch(`${baseUrlTest}/${roleId}`)
        .set('Cookie', cookieHeader ?? '')
        .send({
          name: updateName
        });

      expect(response.status).toBe(200);
      expect(response.body.data.name).toBe(updateName);
    }
  });
});
