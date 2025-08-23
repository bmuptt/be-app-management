export interface ILoginRequest {
  email: string;
  password: string;
}

// Repository specific interfaces
export interface IUserWithRoleBasic {
  id: number;
  role_id?: number | null;
}

export interface IUserWithRoleAndMenus {
  id: number;
  role_id?: number | null;
  role?: {
    id: number;
    name: string;
    created_by?: number | null;
    created_at: Date;
    updated_by?: number | null;
    updated_at: Date;
    menus: Array<{
      access: boolean;
      menu: {
        id: number;
        key_menu: string;
        name: string;
        url: string | null;
        order_number: number;
        active: string;
        menu_id?: number | null;
        created_by?: number | null;
        created_at: Date;
        updated_by?: number | null;
        updated_at: Date;
        children: Array<{
          id: number;
          key_menu: string;
          name: string;
          url: string | null;
          order_number: number;
          active: string;
          menu_id?: number | null;
          created_by?: number | null;
          created_at: Date;
          updated_by?: number | null;
          updated_at: Date;
        }>;
      };
    }>;
  } | null;
}

// Interface untuk role menu dengan menu
export interface IRoleMenuWithMenu {
  access: boolean;
  menu: {
    id: number;
    key_menu: string;
    name: string;
    url: string | null;
    order_number: number;
    active: string;
    menu_id?: number | null;
    created_by?: number | null;
    created_at: Date;
    updated_by?: number | null;
    updated_at: Date;
    children: Array<{
      id: number;
      key_menu: string;
      name: string;
      url: string | null;
      order_number: number;
      active: string;
      menu_id?: number | null;
      created_by?: number | null;
      created_at: Date;
      updated_by?: number | null;
      updated_at: Date;
    }>;
  };
}

export interface IMenuBasic {
  id: number;
  key_menu: string;
  name: string;
  url: string | null;
  order_number: number;
  active: string;
  menu_id?: number | null;
}

export interface IAccessTokenBasic {
  id: number;
  token: string;
  refresh_token: string;
  user_id: number;
  created_at: Date;
}
