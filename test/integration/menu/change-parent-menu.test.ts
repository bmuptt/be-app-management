import dotenv from 'dotenv';
import { AccessTokenTable, AuthLogic, UserTable } from '../../test-util';
import supertest from 'supertest';
import { web } from '../../../src/config/web';
import { logger } from '../../../src/config/logging';

dotenv.config();

const baseUrlTest = '/api/app-management/menu';

let cookies: string | string[];
let refresh_token: string | null;
let cookieHeader: string | null;

describe('Menu Change Parent Flow', () => {
  beforeEach(async () => {
    await UserTable.delete();
    await AccessTokenTable.delete();
    await UserTable.resetUserIdSequence();
    await AccessTokenTable.resetAccessTokenIdSequence();
    await UserTable.callUserSeed();

    const responseLogin = await AuthLogic.getLoginSuperAdmin();
    expect(responseLogin.status).toBe(200);

    cookies = responseLogin.headers['set-cookie'];
    refresh_token = responseLogin.body.refresh_token;

    cookieHeader = Array.isArray(cookies) ? cookies.join('; ') : cookies;
  }, 30000);

  afterEach(async () => {
    await UserTable.delete();
    await AccessTokenTable.delete();
  });

  it('Should handle error cases for change parent menu', async () => {
    // Test 1: Error because the menu does not exist
    const response1 = await supertest(web)
      .post(`${baseUrlTest}/change-parent/10`)
      .set('Cookie', cookieHeader ?? '');

    logger.debug('Error because the menu does not exist', response1.body);
    expect(response1.status).toBe(404);

    // Test 2: Error because the parent menu doesn't exist
    const response2 = await supertest(web)
      .post(`${baseUrlTest}/change-parent/5`)
      .set('Cookie', cookieHeader ?? '')
      .send({
        menu_id: 10,
      });

    logger.debug("Error because the parent menu doesn't exist", response2.body);
    expect(response2.status).toBe(404);

    // Test 3: Error because menu id is invalid (NaN)
    const response3 = await supertest(web)
      .post(`${baseUrlTest}/change-parent/invalid`)
      .set('Cookie', cookieHeader ?? '')
      .send({
        menu_id: 1,
      });

    logger.debug('Error because menu id is invalid (NaN)', response3.body);
    expect(response3.status).toBe(404);

    // Test 4: Error because parent menu id is invalid (NaN)
    const response4 = await supertest(web)
      .post(`${baseUrlTest}/change-parent/5`)
      .set('Cookie', cookieHeader ?? '')
      .send({
        menu_id: 'invalid',
      });

    logger.debug('Error because parent menu id is invalid (NaN)', response4.body);
    expect(response4.status).toBe(404);
  });

  it('Should successfully change parent menu flow', async () => {
    // Test 1: Success change parent to another menu
    const response1 = await supertest(web)
      .post(`${baseUrlTest}/change-parent/5`)
      .set('Cookie', cookieHeader ?? '')
      .send({
        menu_id: 2,
      });

    logger.debug('Success change parent to another menu', {
      status: response1.status,
      body: response1.body,
      headers: response1.headers,
    });

    expect(response1.status).toBe(200);
    expect(response1.body.message).toBe('Success to change parent menu.');
    expect(response1.body.data.menu_id).toBe(2);

    // Test 2: Success change parent to root level (null)
    const response2 = await supertest(web)
      .post(`${baseUrlTest}/change-parent/5`)
      .set('Cookie', cookieHeader ?? '')
      .send({});

    logger.debug('Success change parent to root level (null)', response2.body);
    expect(response2.status).toBe(200);
    expect(response2.body.message).toBe('Success to change parent menu.');
    expect(response2.body.data.menu_id).toBeNull();

    // Test 3: Success change parent and verify in list
    const response3 = await supertest(web)
      .post(`${baseUrlTest}/change-parent/5`)
      .set('Cookie', cookieHeader ?? '')
      .send({
        menu_id: 2,
      });

    const responseList = await supertest(web)
      .get(`${baseUrlTest}/2`)
      .set('Cookie', cookieHeader ?? '');

    logger.debug('Success change parent and verify in list', {
      change: response3.body,
      list: responseList.body,
    });

    expect(response3.status).toBe(200);
    expect(response3.body.message).toBe('Success to change parent menu.');
    expect(responseList.status).toBe(200);

    // Test 4: Success change parent to same parent (no change)
    const response4 = await supertest(web)
      .post(`${baseUrlTest}/change-parent/5`)
      .set('Cookie', cookieHeader ?? '')
      .send({
        menu_id: 2,
      });

    logger.debug('Success change parent to same parent (no change)', response4.body);
    expect(response4.status).toBe(200);
    expect(response4.body.message).toBe('Success to change parent menu.');
    expect(response4.body.data.menu_id).toBe(2);
  });

  it('Should handle complex change parent scenarios', async () => {
    // Test 1: Success change parent multiple times
    const response1 = await supertest(web)
      .post(`${baseUrlTest}/change-parent/5`)
      .set('Cookie', cookieHeader ?? '')
      .send({
        menu_id: 2,
      });

    const response2 = await supertest(web)
      .post(`${baseUrlTest}/change-parent/5`)
      .set('Cookie', cookieHeader ?? '')
      .send({
        menu_id: 3,
      });

    const response3 = await supertest(web)
      .post(`${baseUrlTest}/change-parent/5`)
      .set('Cookie', cookieHeader ?? '')
      .send({});

    logger.debug('Success change parent multiple times', {
      first: response1.body,
      second: response2.body,
      third: response3.body,
    });

    expect(response1.status).toBe(200);
    expect(response2.status).toBe(200);
    expect(response3.status).toBe(200);
    expect(response1.body.data.menu_id).toBe(2);
    expect(response2.body.data.menu_id).toBe(3);
    expect(response3.body.data.menu_id).toBeNull();

    // Test 2: Success change parent and verify order number is updated
    const responseBefore = await supertest(web)
      .get(`${baseUrlTest}/5/detail`)
      .set('Cookie', cookieHeader ?? '');

    const responseChange = await supertest(web)
      .post(`${baseUrlTest}/change-parent/5`)
      .set('Cookie', cookieHeader ?? '')
      .send({
        menu_id: 2,
      });

    const responseAfter = await supertest(web)
      .get(`${baseUrlTest}/5/detail`)
      .set('Cookie', cookieHeader ?? '');

    logger.debug('Success change parent and verify order number is updated', {
      before: responseBefore.body.data,
      change: responseChange.body,
      after: responseAfter.body.data,
    });

    expect(responseChange.status).toBe(200);
    expect(responseChange.body.message).toBe('Success to change parent menu.');
    expect(responseAfter.body.data.menu_id).toBe(2);
    expect(responseAfter.body.data.order_number).toBeGreaterThan(0);
  });
});
