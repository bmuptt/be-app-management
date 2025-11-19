import dotenv from 'dotenv';
import { TestHelper, AuthLogic } from '../../test-util';
import supertest from 'supertest';
import { web } from '../../../src/config/web';

dotenv.config();

const baseUrlTest = '/api/app-management/role';

describe('Update Role', () => {
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
    it('should reject update role request without authentication', async () => {
      const response = await supertest(web)
        .patch(`${baseUrlTest}/1`)
        .send({
          name: 'Updated Role',
        });

      expect(response.status).toBe(401);
    });
  });

  describe('Validation - Required Fields', () => {
    it('should reject when name is missing', async () => {
      // Create a role first
      const createResponse = await supertest(web)
        .post(baseUrlTest)
        .set('Cookie', cookieHeader ?? '')
        .send({
          name: 'Test Role',
        });

      const roleId = createResponse.body.data.id;

      const response = await supertest(web)
        .patch(`${baseUrlTest}/${roleId}`)
        .set('Cookie', cookieHeader ?? '')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.errors).toContain('The name is required!');
    });

    it('should reject when name is empty', async () => {
      // Create a role first
      const createResponse = await supertest(web)
        .post(baseUrlTest)
        .set('Cookie', cookieHeader ?? '')
        .send({
          name: 'Test Role',
        });

      const roleId = createResponse.body.data.id;

      const response = await supertest(web)
        .patch(`${baseUrlTest}/${roleId}`)
        .set('Cookie', cookieHeader ?? '')
        .send({
          name: '',
        });

      expect(response.status).toBe(400);
      expect(response.body.errors).toContain('The name is required!');
    });
  });

  describe('Validation - Duplicate Name', () => {
    it('should reject duplicate role name from another role', async () => {
      // Create first role
      const createResponse1 = await supertest(web)
        .post(baseUrlTest)
        .set('Cookie', cookieHeader ?? '')
        .send({
          name: 'First Role',
        });

      // Create second role
      const createResponse2 = await supertest(web)
        .post(baseUrlTest)
        .set('Cookie', cookieHeader ?? '')
        .send({
          name: 'Second Role',
        });

      const roleId2 = createResponse2.body.data.id;

      // Try to update second role with first role's name
      const response = await supertest(web)
        .patch(`${baseUrlTest}/${roleId2}`)
        .set('Cookie', cookieHeader ?? '')
        .send({
          name: 'First Role',
        });

      expect(response.status).toBe(400);
      expect(response.body.errors).toContain('The name cannot be the same!');
    });

    it('should allow same name for same role', async () => {
      // Create a role
      const createResponse = await supertest(web)
        .post(baseUrlTest)
        .set('Cookie', cookieHeader ?? '')
        .send({
          name: 'Test Role',
        });

      const roleId = createResponse.body.data.id;

      // Update with same name
      const response = await supertest(web)
        .patch(`${baseUrlTest}/${roleId}`)
        .set('Cookie', cookieHeader ?? '')
        .send({
          name: 'Test Role',
        });

      expect(response.status).toBe(200);
      expect(response.body.data.name).toBe('Test Role');
    });
  });

  describe('Validation - Role Existence', () => {
    it('should reject when role does not exist', async () => {
      const response = await supertest(web)
        .patch(`${baseUrlTest}/999999`)
        .set('Cookie', cookieHeader ?? '')
        .send({
          name: 'Updated Name',
        });

      expect(response.status).toBe(404);
      expect(response.body.errors).toContain('The role does not exist!');
    });

    it('should reject invalid role ID format', async () => {
      const response = await supertest(web)
        .patch(`${baseUrlTest}/invalid`)
        .set('Cookie', cookieHeader ?? '')
        .send({
          name: 'Updated Name',
        });

      // Invalid ID format akan menyebabkan error di Prisma
      expect(response.status).toBe(500);
    });
  });

  describe('Success Cases', () => {
    it('should successfully update role with valid name', async () => {
      // Create a role
      const createResponse = await supertest(web)
        .post(baseUrlTest)
        .set('Cookie', cookieHeader ?? '')
        .send({
          name: 'Original Role Name',
        });

      const roleId = createResponse.body.data.id;

      // Update the role
      const response = await supertest(web)
        .patch(`${baseUrlTest}/${roleId}`)
        .set('Cookie', cookieHeader ?? '')
        .send({
          name: 'Updated Role Name',
        });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Success to edit data role.');
      expect(response.body.data.id).toBe(roleId);
      expect(response.body.data.name).toBe('Updated Role Name');
      expect(response.body.data.updated_by).toBe(1); // Admin user ID
    });

    it('should update updated_by field', async () => {
      // Create a role
      const createResponse = await supertest(web)
        .post(baseUrlTest)
        .set('Cookie', cookieHeader ?? '')
        .send({
          name: 'Test Role',
        });

      const roleId = createResponse.body.data.id;

      // Update the role
      const response = await supertest(web)
        .patch(`${baseUrlTest}/${roleId}`)
        .set('Cookie', cookieHeader ?? '')
        .send({
          name: 'Updated Role',
        });

      expect(response.status).toBe(200);
      expect(response.body.data.updated_by).toBe(1); // Admin user ID
    });

    it('should accept special characters in name', async () => {
      // Create a role
      const createResponse = await supertest(web)
        .post(baseUrlTest)
        .set('Cookie', cookieHeader ?? '')
        .send({
          name: 'Test Role',
        });

      const roleId = createResponse.body.data.id;

      const specialName = 'Role with @#$%^&*()_+-=[]{}|;:,.<>?';

      const response = await supertest(web)
        .patch(`${baseUrlTest}/${roleId}`)
        .set('Cookie', cookieHeader ?? '')
        .send({
          name: specialName,
        });

      expect(response.status).toBe(200);
      expect(response.body.data.name).toBe(specialName);
    });

    it('should accept unicode characters in name', async () => {
      // Create a role
      const createResponse = await supertest(web)
        .post(baseUrlTest)
        .set('Cookie', cookieHeader ?? '')
        .send({
          name: 'Test Role',
        });

      const roleId = createResponse.body.data.id;

      const unicodeName = 'Rôle avec caractères spéciaux 角色 役割';

      const response = await supertest(web)
        .patch(`${baseUrlTest}/${roleId}`)
        .set('Cookie', cookieHeader ?? '')
        .send({
          name: unicodeName,
        });

      expect(response.status).toBe(200);
      expect(response.body.data.name).toBe(unicodeName);
    });
  });

  describe('Response Structure', () => {
    it('should return correct response structure', async () => {
      // Create a role
      const createResponse = await supertest(web)
        .post(baseUrlTest)
        .set('Cookie', cookieHeader ?? '')
        .send({
          name: 'Structure Test Role',
        });

      const roleId = createResponse.body.data.id;

      // Update the role
      const response = await supertest(web)
        .patch(`${baseUrlTest}/${roleId}`)
        .set('Cookie', cookieHeader ?? '')
        .send({
          name: 'Updated Role Structure',
        });

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
  });
});
