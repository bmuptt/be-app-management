import { ILoginRequest } from './auth-model';

export interface IRequestUser {
  name: string;
  email: string;
  gender: string;
  birthdate: Date;
  role_id?: number | null;
}

export interface IUserObject
  extends ILoginRequest,
    Pick<IRequestUser, 'name' | 'gender' | 'birthdate' | 'role_id'> {
  id: number;
  photo?: string | null;
  active: string;
  created_by?: number | null;
  created_at: Date;
  updated_by?: number | null;
  updated_at: Date;
}

// Interface untuk user tanpa password (untuk internal use)
export interface IUserObjectWithoutPassword
  extends Pick<IRequestUser, 'name' | 'gender' | 'birthdate' | 'role_id'> {
  id: number;
  email: string;
  photo?: string | null;
  active: string;
  created_by?: number | null;
  created_at: Date;
  updated_by?: number | null;
  updated_at: Date;
}

// Repository specific interfaces
export interface IUserWithRole {
  id: number;
  name: string;
  email: string;
  gender: string;
  birthdate: Date;
  photo?: string | null;
  active: string;
  role_id?: number | null;
  created_by?: number | null;
  created_at: Date;
  updated_by?: number | null;
  updated_at: Date;
  role?: {
    id: number;
    name: string;
    created_by?: number | null;
    created_at: Date;
    updated_by?: number | null;
    updated_at: Date;
  } | null;
}

export interface IUserCreateData {
  email: string;
  name: string;
  gender: string;
  birthdate: Date;
  password: string;
  active: 'Active' | 'Inactive';
  role_id?: number | null;
  created_by?: number | null;
}

export interface IUserUpdateData {
  name?: string;
  gender?: string;
  birthdate?: Date;
  role_id?: number | null;
  updated_by?: number | null;
}
