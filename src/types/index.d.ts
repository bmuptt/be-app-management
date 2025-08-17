import { JwtPayload } from 'jsonwebtoken';
import { IUserObject } from '../model/user-model';

declare module 'express-serve-static-core' {
  interface Request {
    user?: IUserObject;  // Tambahkan tipe yang sesuai dengan decoded token
  }
}