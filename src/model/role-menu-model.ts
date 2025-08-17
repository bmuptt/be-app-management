export interface IRequestRoleMenu {
  menu_id: number;
  access: boolean;
  create?: boolean;
  update?: boolean;
  delete?: boolean;
  approval?: boolean;
  approval_2?: boolean;
  approval_3?: boolean;
}

export interface IMenuWithPerm {
  id: number;
  key_menu: string;
  name: string;
  url: string | null;
  order_number: number;
  active: string;
  permissions: {
    access: boolean;
    create: boolean;
    update: boolean;
    delete: boolean;
    approval: boolean;
    approval_2: boolean;
    approval_3: boolean;
  };
  children: IMenuWithPerm[];
}

export interface IRoleMenuResponse {
  data: IMenuWithPerm[];
}

export interface IRoleMenuPerm {
  menu_id: number;
  role_id: number;
  access: boolean;
  create: boolean;
  update: boolean;
  delete: boolean;
  approval: boolean;
  approval_2: boolean;
  approval_3: boolean;
}
