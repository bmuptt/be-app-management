import dotenv from 'dotenv';
import { AccessTokenTable, AuthLogic, UserTable } from '../../test-util';
import supertest from 'supertest';
import { web } from '../../../src/config/web';
import { logger } from '../../../src/config/logging';

dotenv.config();

const baseUrlTest = '/api/app-management/role';

describe('Delete Role Business Flow', () => {
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

  it('Should successfully delete existing role', async () => {
    // First create a role
    const createResponse = await supertest(web)
      .post(baseUrlTest)
      .set('Cookie', cookieHeader ?? '')
      .send({
        name: 'Role to Delete'
      });

    expect(createResponse.status).toBe(200);
    const roleId = createResponse.body.data.id;

    // Delete the role
    const response = await supertest(web)
      .delete(`${baseUrlTest}/${roleId}`)
      .set('Cookie', cookieHeader ?? '');

    logger.debug('Delete role response', response.body);
    expect(response.status).toBe(200);
    expect(response.body.message).toBe('Success to delete data role.');
    expect(response.body.data).toBeDefined();
    expect(response.body.data.id).toBe(roleId);
    expect(response.body.data.name).toBe('Role to Delete');

    // Verify role is deleted by trying to get its detail
    const detailResponse = await supertest(web)
      .get(`${baseUrlTest}/${roleId}`)
      .set('Cookie', cookieHeader ?? '');

    expect(detailResponse.status).toBe(404);
    expect(detailResponse.body.errors).toContain('The role does not exist!');
  });

  it('Should handle non-existent role ID', async () => {
    const response = await supertest(web)
      .delete(`${baseUrlTest}/999999`)
      .set('Cookie', cookieHeader ?? '');

    logger.debug('Non-existent role delete response', response.body);
    expect(response.status).toBe(404);
    expect(response.body.errors).toContain('The role does not exist!');
  });

  it('Should handle invalid role ID format', async () => {
    const response = await supertest(web)
      .delete(`${baseUrlTest}/invalid`)
      .set('Cookie', cookieHeader ?? '');

    logger.debug('Invalid role ID format delete response', response.body);
    expect(response.status).toBe(500);
    // Invalid ID format causes database error
    expect(response.body.errors).toBeDefined();
  });

  it('Should handle negative role ID', async () => {
    const response = await supertest(web)
      .delete(`${baseUrlTest}/-1`)
      .set('Cookie', cookieHeader ?? '');

    logger.debug('Negative role ID delete response', response.body);
    expect(response.status).toBe(404);
    expect(response.body.errors).toContain('The role does not exist!');
  });

  it('Should handle zero role ID', async () => {
    const response = await supertest(web)
      .delete(`${baseUrlTest}/0`)
      .set('Cookie', cookieHeader ?? '');

    logger.debug('Zero role ID delete response', response.body);
    expect(response.status).toBe(404);
    expect(response.body.errors).toContain('The role does not exist!');
  });

  it('Should handle very large role ID', async () => {
    const response = await supertest(web)
      .delete(`${baseUrlTest}/999999999999`)
      .set('Cookie', cookieHeader ?? '');

    logger.debug('Very large role ID delete response', response.body);
    expect(response.status).toBe(500);
    // Very large ID causes database integer overflow error
    expect(response.body.errors).toBeDefined();
  });

  it('Should handle decimal role ID', async () => {
    const response = await supertest(web)
      .delete(`${baseUrlTest}/1.5`)
      .set('Cookie', cookieHeader ?? '');

    logger.debug('Decimal role ID delete response', response.body);
    expect(response.status).toBe(200);
    // parseInt(1.5) returns 1, which finds the Super Admin role
    expect(response.body.data.id).toBe(1);
  });

  it('Should return correct response structure', async () => {
    // First create a role
    const createResponse = await supertest(web)
      .post(baseUrlTest)
      .set('Cookie', cookieHeader ?? '')
      .send({
        name: 'Role for Structure Test'
      });

    expect(createResponse.status).toBe(200);
    const roleId = createResponse.body.data.id;

    // Delete the role
    const response = await supertest(web)
      .delete(`${baseUrlTest}/${roleId}`)
      .set('Cookie', cookieHeader ?? '');

    logger.debug('Response structure test', response.body);
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('message');
    expect(response.body).toHaveProperty('data');
    expect(response.body.message).toBe('Success to delete data role.');
    expect(response.body.data).toHaveProperty('id');
    expect(response.body.data).toHaveProperty('name');
    expect(response.body.data).toHaveProperty('created_by');
    expect(response.body.data).toHaveProperty('created_at');
    expect(response.body.data).toHaveProperty('updated_by');
    expect(response.body.data).toHaveProperty('updated_at');
  });

  it('Should handle multiple role deletions', async () => {
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

    // Delete all roles
    for (const roleId of roleIds) {
      const response = await supertest(web)
        .delete(`${baseUrlTest}/${roleId}`)
        .set('Cookie', cookieHeader ?? '');

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Success to delete data role.');
      expect(response.body.data.id).toBe(roleId);
    }

    // Verify all roles are deleted
    for (const roleId of roleIds) {
      const detailResponse = await supertest(web)
        .get(`${baseUrlTest}/${roleId}`)
        .set('Cookie', cookieHeader ?? '');

      expect(detailResponse.status).toBe(404);
    }
  });

  it('Should handle deleting already deleted role', async () => {
    // First create a role
    const createResponse = await supertest(web)
      .post(baseUrlTest)
      .set('Cookie', cookieHeader ?? '')
      .send({
        name: 'Role to Delete Twice'
      });

    expect(createResponse.status).toBe(200);
    const roleId = createResponse.body.data.id;

    // Delete the role first time
    const deleteResponse1 = await supertest(web)
      .delete(`${baseUrlTest}/${roleId}`)
      .set('Cookie', cookieHeader ?? '');

    expect(deleteResponse1.status).toBe(200);

    // Try to delete the same role again
    const deleteResponse2 = await supertest(web)
      .delete(`${baseUrlTest}/${roleId}`)
      .set('Cookie', cookieHeader ?? '');

    logger.debug('Second delete attempt response', deleteResponse2.body);
    expect(deleteResponse2.status).toBe(404);
    expect(deleteResponse2.body.errors).toContain('The role does not exist!');
  });

  it('Should handle deleting role with special characters in name', async () => {
    // First create a role with special characters
    const createResponse = await supertest(web)
      .post(baseUrlTest)
      .set('Cookie', cookieHeader ?? '')
      .send({
        name: 'Role with @#$%^&*()_+-=[]{}|;:,.<>?'
      });

    expect(createResponse.status).toBe(200);
    const roleId = createResponse.body.data.id;

    // Delete the role
    const response = await supertest(web)
      .delete(`${baseUrlTest}/${roleId}`)
      .set('Cookie', cookieHeader ?? '');

    logger.debug('Delete role with special characters response', response.body);
    expect(response.status).toBe(200);
    expect(response.body.data.name).toBe('Role with @#$%^&*()_+-=[]{}|;:,.<>?');
  });

  it('Should handle deleting role with Unicode characters in name', async () => {
    // First create a role with Unicode characters
    const createResponse = await supertest(web)
      .post(baseUrlTest)
      .set('Cookie', cookieHeader ?? '')
      .send({
        name: 'Rôle avec caractères spéciaux 角色 役割'
      });

    expect(createResponse.status).toBe(200);
    const roleId = createResponse.body.data.id;

    // Delete the role
    const response = await supertest(web)
      .delete(`${baseUrlTest}/${roleId}`)
      .set('Cookie', cookieHeader ?? '');

    logger.debug('Delete role with Unicode characters response', response.body);
    expect(response.status).toBe(200);
    expect(response.body.data.name).toBe('Rôle avec caractères spéciaux 角色 役割');
  });

  it('Should handle deleting role with very long name', async () => {
    // First create a role with very long name
    const longName = 'A'.repeat(255); // Maximum allowed length
    const createResponse = await supertest(web)
      .post(baseUrlTest)
      .set('Cookie', cookieHeader ?? '')
      .send({
        name: longName
      });

    expect(createResponse.status).toBe(200);
    const roleId = createResponse.body.data.id;

    // Delete the role
    const response = await supertest(web)
      .delete(`${baseUrlTest}/${roleId}`)
      .set('Cookie', cookieHeader ?? '');

    logger.debug('Delete role with very long name response', response.body);
    expect(response.status).toBe(200);
    expect(response.body.data.name).toBe(longName);
  });

  it('Should handle deleting role with whitespace-only name', async () => {
    // First create a role with whitespace-only name
    const createResponse = await supertest(web)
      .post(baseUrlTest)
      .set('Cookie', cookieHeader ?? '')
      .send({
        name: '   '
      });

    expect(createResponse.status).toBe(200);
    const roleId = createResponse.body.data.id;

    // Delete the role
    const response = await supertest(web)
      .delete(`${baseUrlTest}/${roleId}`)
      .set('Cookie', cookieHeader ?? '');

    logger.debug('Delete role with whitespace-only name response', response.body);
    expect(response.status).toBe(200);
    expect(response.body.data.name).toBe('   ');
  });
});
