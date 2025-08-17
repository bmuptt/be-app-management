import { ILoginRequest } from "./auth-model";

export interface IRequestUser {
  name: string;
  email: string;
  gender: string;
  birthdate: Date;
  role_id?: number | null;
}

export interface IUserObject extends ILoginRequest, Pick<IRequestUser, "name" | "gender" | "birthdate" | "role_id"> {
  id: number;
  photo?: string | null;
  active: 'Active' | 'Inactive';
  created_by?: number | null;
  created_at: Date;
  updated_by?: number | null;
  updated_at: Date;
}
