export interface IRequestRole {
    name: string;
}

export interface IRoleObject {
    id: number;
    name: string;
    created_by?: number | null;
    created_at: Date;
    updated_by?: number | null;
    updated_at: Date;
}

export interface IRoleCreateData {
    name: string;
    created_by?: number | null;
}

export interface IRoleUpdateData {
    name: string;
    updated_by?: number | null;
}

export interface IRoleListResponse {
    data: IRoleObject[];
    total: number;
}