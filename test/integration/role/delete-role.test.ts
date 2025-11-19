import dotenv from 'dotenv';
import { TestHelper, AuthLogic } from '../../test-util';
import supertest from 'supertest';
import { web } from '../../../src/config/web';

dotenv.config();

const baseUrlTest = '/api/app-management/role';

describe('Delete Role', () => {
  let cookieHeader: string | null;

  beforeEach(async () => {
    await TestHelper.refreshDatabase();

    const loginResponse = await AuthLogic.getLoginSuperAdmin();
    const cookies = loginResponse.headers['set-cookie'];
    cookieHeader = Array.isArray(cookies) ? cookies.join('; ') : cookies;
  });

  afterEach(async () => {
    await TestHelper.cleanupDatabase();
  });

  describe('Authentication', () => {
    it('should reject delete role request without authentication', async () => {
      const response = await supertest(web).delete(`${baseUrlTest}/1`);

      expect(response.status).toBe(401);
    });
  });

  describe('Success Cases', () => {
    it('should successfully delete role', async () => {
      // Create a role
      const createResponse = await supertest(web)
        .post(baseUrlTest)
        .set('Cookie', cookieHeader ?? '')
        .send({
          name: 'Role to Delete',
        });

      const roleId = createResponse.body.data.id;

      // Delete the role
      const response = await supertest(web)
        .delete(`${baseUrlTest}/${roleId}`)
        .set('Cookie', cookieHeader ?? '');

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Success to delete data role.');
      expect(response.body.data).toBeDefined();
      expect(response.body.data.id).toBe(roleId);
      expect(response.body.data.name).toBe('Role to Delete');
    });

    it('should verify role is deleted after deletion', async () => {
      // Create a role
      const createResponse = await supertest(web)
        .post(baseUrlTest)
        .set('Cookie', cookieHeader ?? '')
        .send({
          name: 'Role to Delete',
        });

      const roleId = createResponse.body.data.id;

      // Delete the role
      await supertest(web)
        .delete(`${baseUrlTest}/${roleId}`)
        .set('Cookie', cookieHeader ?? '');

      // Verify role is deleted by trying to get its detail
      const detailResponse = await supertest(web)
        .get(`${baseUrlTest}/${roleId}`)
        .set('Cookie', cookieHeader ?? '');

      expect(detailResponse.status).toBe(404);
      expect(detailResponse.body.errors).toContain('The role does not exist!');
    });
  });

  describe('Error Cases', () => {
    it('should return 404 for non-existent role ID', async () => {
      const response = await supertest(web)
        .delete(`${baseUrlTest}/999999`)
        .set('Cookie', cookieHeader ?? '');

      expect(response.status).toBe(404);
      expect(response.body.errors).toContain('The role does not exist!');
    });

    it('should return 404 for zero role ID', async () => {
      const response = await supertest(web)
        .delete(`${baseUrlTest}/0`)
        .set('Cookie', cookieHeader ?? '');

      expect(response.status).toBe(404);
      expect(response.body.errors).toContain('The role does not exist!');
    });

    it('should return 404 for negative role ID', async () => {
      const response = await supertest(web)
        .delete(`${baseUrlTest}/-1`)
        .set('Cookie', cookieHeader ?? '');

      expect(response.status).toBe(404);
      expect(response.body.errors).toContain('The role does not exist!');
    });

    it('should return 500 for invalid role ID format', async () => {
      const response = await supertest(web)
        .delete(`${baseUrlTest}/invalid`)
        .set('Cookie', cookieHeader ?? '');

      // Invalid ID format akan menyebabkan error di Prisma
      expect(response.status).toBe(500);
    });
  });

  describe('Multiple Deletions', () => {
    it('should handle multiple role deletions', async () => {
      // Create multiple roles
      const roles = ['Role 1', 'Role 2', 'Role 3'];
      const roleIds: number[] = [];

      for (const roleName of roles) {
        const createResponse = await supertest(web)
          .post(baseUrlTest)
          .set('Cookie', cookieHeader ?? '')
          .send({
            name: roleName,
          });

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

    it('should return 404 when deleting already deleted role', async () => {
      // Create a role
      const createResponse = await supertest(web)
        .post(baseUrlTest)
        .set('Cookie', cookieHeader ?? '')
        .send({
          name: 'Role to Delete Twice',
        });

      const roleId = createResponse.body.data.id;

      // Delete the role first time
      await supertest(web)
        .delete(`${baseUrlTest}/${roleId}`)
        .set('Cookie', cookieHeader ?? '');

      // Try to delete the same role again
      const response = await supertest(web)
        .delete(`${baseUrlTest}/${roleId}`)
        .set('Cookie', cookieHeader ?? '');

      expect(response.status).toBe(404);
      expect(response.body.errors).toContain('The role does not exist!');
    });
  });

  describe('Response Structure', () => {
    it('should return correct response structure', async () => {
      // Create a role
      const createResponse = await supertest(web)
        .post(baseUrlTest)
        .set('Cookie', cookieHeader ?? '')
        .send({
          name: 'Role for Structure Test',
        });

      const roleId = createResponse.body.data.id;

      // Delete the role
      const response = await supertest(web)
        .delete(`${baseUrlTest}/${roleId}`)
        .set('Cookie', cookieHeader ?? '');

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
  });
});
