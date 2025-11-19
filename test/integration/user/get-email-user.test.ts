import dotenv from 'dotenv';
import supertest from 'supertest';
import bcrypt from 'bcrypt';
import { web } from '../../../src/config/web';
import { prismaClient } from '../../../src/config/database';
import { AuthLogic, TestHelper } from '../../test-util';

dotenv.config();

const baseUrl = '/api/app-management/user/get-email';

describe('Get User Email (External Service)', () => {
  let cookieHeader: string | null;

  beforeEach(async () => {
    await TestHelper.refreshDatabase();

    const loginResponse = await AuthLogic.getLoginSuperAdmin();
    const cookies = loginResponse.headers['set-cookie'];
    cookieHeader = Array.isArray(cookies) ? cookies.join('; ') : cookies;
  });

  afterEach(async () => {
    await TestHelper.cleanupDatabase();
    cookieHeader = null;
  });

  const createUser = async (email: string, name: string) => {
    const role = await prismaClient.role.findFirst({
      where: { name: 'Super Admin' },
    });

    const hashedPassword = await bcrypt.hash('Password123', 10);

    return prismaClient.user.create({
      data: {
        email,
        name,
        password: hashedPassword,
        gender: 'Male',
        birthdate: new Date('1990-01-01'),
        active: 'Active',
        role_id: role?.id,
        created_by: role?.id ?? 0,
      },
    });
  };

  it('should reject request without authentication', async () => {
    const response = await supertest(web)
      .get(baseUrl)
      .query({ ids: '1' });

    expect(response.status).toBe(401);
  });

  it('should return emails for valid ids when authenticated', async () => {
    const userOne = await createUser('first@example.com', 'First User');
    const userTwo = await createUser('second@example.com', 'Second User');

    const response = await supertest(web)
      .get(baseUrl)
      .query({ ids: `${userOne.id},${userTwo.id}` })
      .set('Accept', 'application/json')
      .set('Cookie', cookieHeader ?? '');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toEqual([
      { id: userOne.id, email: userOne.email },
      { id: userTwo.id, email: userTwo.email },
    ]);
  });

  it('should return empty array when ids do not match any user', async () => {
    const response = await supertest(web)
      .get(baseUrl)
      .query({ ids: '999' })
      .set('Accept', 'application/json')
      .set('Cookie', cookieHeader ?? '');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toEqual([]);
  });

  it('should reject request when ids are missing', async () => {
    const response = await supertest(web)
      .get(baseUrl)
      .set('Cookie', cookieHeader ?? '');

    expect(response.status).toBe(400);
    expect(Array.isArray(response.body.errors)).toBe(true);
    expect(response.body.errors).toContain('The ids is required!');
  });

  it('should reject request when ids contain non-numeric values', async () => {
    const response = await supertest(web)
      .get(baseUrl)
      .query({ ids: 'abc,1' })
      .set('Accept', 'application/json')
      .set('Cookie', cookieHeader ?? '');

    expect(response.status).toBe(400);
    expect(Array.isArray(response.body.errors)).toBe(true);
    expect(response.body.errors).toContain(
      'The ids must be positive integers!',
    );
  });
});

