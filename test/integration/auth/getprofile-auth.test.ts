import dotenv from 'dotenv';
import { TestHelper, AuthLogic } from '../../test-util';
import supertest from 'supertest';
import { web } from '../../../src/config/web';

dotenv.config();

describe('Get Profile', () => {
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
    it('should reject profile request without authentication', async () => {
      const response = await supertest(web).get('/api/profile');

      expect(response.status).toBe(401);
    });

    it('should successfully retrieve profile with valid authentication', async () => {
      const response = await supertest(web)
        .get('/api/profile')
        .set('Cookie', cookieHeader ?? '');

      expect(response.status).toBe(200);
      expect(response.body.profile).toBeDefined();
      expect(response.body.menu).toBeDefined();
    });
  });

  describe('Profile Data Structure', () => {
    it('should return profile with correct structure', async () => {
      const response = await supertest(web)
        .get('/api/profile')
        .set('Cookie', cookieHeader ?? '');

      expect(response.status).toBe(200);
      expect(response.body.profile).toHaveProperty('id');
      expect(response.body.profile).toHaveProperty('email');
      expect(response.body.profile).toHaveProperty('name');
      expect(response.body.profile).toHaveProperty('gender');
      expect(response.body.profile).toHaveProperty('birthdate');
      expect(response.body.profile).toHaveProperty('role_id');
      expect(response.body.profile).toHaveProperty('created_at');
      expect(response.body.profile).toHaveProperty('updated_at');
      expect(response.body.profile).not.toHaveProperty('password');
    });

    it('should return correct user email in profile', async () => {
      const response = await supertest(web)
        .get('/api/profile')
        .set('Cookie', cookieHeader ?? '');

      expect(response.status).toBe(200);
      expect(response.body.profile.email).toBe(process.env.EMAIL_ADMIN);
    });
  });

  describe('Menu Data', () => {
    it('should return menu array', async () => {
      const response = await supertest(web)
        .get('/api/profile')
        .set('Cookie', cookieHeader ?? '');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.menu)).toBe(true);
      expect(response.body.menu.length).toBeGreaterThan(0);
    });

    it('should return menu with hierarchical structure', async () => {
      const response = await supertest(web)
        .get('/api/profile')
        .set('Cookie', cookieHeader ?? '');

      expect(response.status).toBe(200);
      expect(response.body.menu).toBeDefined();
      
      // Check if menu has children property (for hierarchical structure)
      if (response.body.menu.length > 0) {
        const firstMenu = response.body.menu[0];
        expect(firstMenu).toHaveProperty('children');
      }
    });
  });

  describe('Response Message', () => {
    it('should return success message', async () => {
      const response = await supertest(web)
        .get('/api/profile')
        .set('Cookie', cookieHeader ?? '');

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Profile retrieved successfully');
    });
  });
});
