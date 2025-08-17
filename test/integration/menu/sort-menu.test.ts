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

describe('Menu Sort Flow', () => {
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

  it('Should handle error cases for sort menu', async () => {
    // Test 1: Error if the body request is not filled in
    const response1 = await supertest(web)
      .post(`${baseUrlTest}/sort/1`)
      .set('Cookie', cookieHeader ?? '');

    logger.debug('Error if the body request is not filled in', response1.body);
    expect(response1.body.errors).toEqual(
      expect.arrayContaining([
        'The list menu must contain more equal to than 1 item!',
      ])
    );
    expect(response1.status).toBe(400);

    // Test 2: Error because the list menu must contain more equal to than 1 item
    const response2 = await supertest(web)
      .post(`${baseUrlTest}/sort/1`)
      .set('Cookie', cookieHeader ?? '')
      .send({
        list_menu: [],
      });

    logger.debug('Error because the list menu must contain more equal to than 1 item', response2.body);
    expect(response2.body.errors).toEqual(
      expect.arrayContaining([
        'The list menu must contain more equal to than 1 item!',
      ])
    );
    expect(response2.status).toBe(400);

    // Test 3: Error because the id list not found
    const response3 = await supertest(web)
      .post(`${baseUrlTest}/sort/1`)
      .set('Cookie', cookieHeader ?? '')
      .send({
        list_menu: [
          {
            id: 2,
          },
          {
            id: 10,
          },
        ],
      });

    logger.debug('Error because the id list not found', response3.body);
    expect(response3.status).toBe(404);

    // Test 4: Error because menu id is invalid (NaN)
    const response4 = await supertest(web)
      .post(`${baseUrlTest}/sort/invalid`)
      .set('Cookie', cookieHeader ?? '')
      .send({
        list_menu: [
          {
            id: 2,
          },
          {
            id: 3,
          },
        ],
      });

    logger.debug('Error because menu id is invalid (NaN)', response4.body);
    expect(response4.status).toBe(404);

    // Test 5: Error because menu id is 0 (root level)
    const response5 = await supertest(web)
      .post(`${baseUrlTest}/sort/0`)
      .set('Cookie', cookieHeader ?? '')
      .send({
        list_menu: [
          {
            id: 1,
          },
          {
            id: 10,
          },
        ],
      });

    logger.debug('Error because menu id is 0 (root level)', response5.body);
    expect(response5.status).toBe(404);
  });

  it('Should successfully sort menu flow', async () => {
    // Test 1: Success sort menu with valid list
    const response1 = await supertest(web)
      .post(`${baseUrlTest}/sort/1`)
      .set('Cookie', cookieHeader ?? '')
      .send({
        list_menu: [
          {
            id: 3,
          },
          {
            id: 2,
          },
          {
            id: 4,
          },
          {
            id: 5,
          },
        ],
      });

    logger.debug('Success sort menu with valid list', response1.body);
    expect(response1.status).toBe(200);
    expect(response1.body.message).toBe('Success to sort data menu.');

    // Test 2: Success sort menu and verify order changes
    const responseBefore = await supertest(web)
      .get(`${baseUrlTest}/1`)
      .set('Cookie', cookieHeader ?? '');

    const response2 = await supertest(web)
      .post(`${baseUrlTest}/sort/1`)
      .set('Cookie', cookieHeader ?? '')
      .send({
        list_menu: [
          {
            id: 4,
          },
          {
            id: 5,
          },
          {
            id: 2,
          },
          {
            id: 3,
          },
        ],
      });

    const responseAfter = await supertest(web)
      .get(`${baseUrlTest}/1`)
      .set('Cookie', cookieHeader ?? '');

    logger.debug('Success sort menu and verify order changes', {
      before: responseBefore.body.data,
      after: responseAfter.body.data,
    });

    expect(response2.status).toBe(200);
    expect(response2.body.message).toBe('Success to sort data menu.');

    // Test 3: Success sort menu with single item
    const response3 = await supertest(web)
      .post(`${baseUrlTest}/sort/1`)
      .set('Cookie', cookieHeader ?? '')
      .send({
        list_menu: [
          {
            id: 2,
          },
        ],
      });

    logger.debug('Success sort menu with single item', response3.body);
    expect(response3.status).toBe(200);
    expect(response3.body.message).toBe('Success to sort data menu.');

    // Test 4: Success sort menu with reverse order
    const response4 = await supertest(web)
      .post(`${baseUrlTest}/sort/1`)
      .set('Cookie', cookieHeader ?? '')
      .send({
        list_menu: [
          {
            id: 5,
          },
          {
            id: 4,
          },
          {
            id: 3,
          },
          {
            id: 2,
          },
        ],
      });

    logger.debug('Success sort menu with reverse order', response4.body);
    expect(response4.status).toBe(200);
    expect(response4.body.message).toBe('Success to sort data menu.');
  });

  it('Should handle complex sort scenarios', async () => {
    // Test 1: Success sort menu multiple times
    const response1 = await supertest(web)
      .post(`${baseUrlTest}/sort/1`)
      .set('Cookie', cookieHeader ?? '')
      .send({
        list_menu: [
          {
            id: 3,
          },
          {
            id: 2,
          },
          {
            id: 4,
          },
          {
            id: 5,
          },
        ],
      });

    const response2 = await supertest(web)
      .post(`${baseUrlTest}/sort/1`)
      .set('Cookie', cookieHeader ?? '')
      .send({
        list_menu: [
          {
            id: 2,
          },
          {
            id: 3,
          },
          {
            id: 4,
          },
          {
            id: 5,
          },
        ],
      });

    logger.debug('Success sort menu multiple times', {
      first: response1.body,
      second: response2.body,
    });

    expect(response1.status).toBe(200);
    expect(response2.status).toBe(200);
    expect(response1.body.message).toBe('Success to sort data menu.');
    expect(response2.body.message).toBe('Success to sort data menu.');
  });
});
