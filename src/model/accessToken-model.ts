import { IUserObject } from './user-model';

export interface IAccessTokenResponse {
  token: string;
  refresh_token: string;
}

export interface IUserObjectRefresh extends IUserObject {
  randomString: string;
  iat: number;
}
