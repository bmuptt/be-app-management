export interface IRequestMenu {
  key_menu: string;
  name: string;
  url?: string | null;
}

export interface IRequestMenuChangeParent {
  menu_id?: number | null;
}

export interface IRequestMenuStore
  extends IRequestMenu,
    IRequestMenuChangeParent {}

export interface IRequestMenuSort {
  list_menu: { id: number }[];
}

export interface IMenu extends IRequestMenu {
  id: number;
  order_number: number;
  active: string;
  menu_id?: number | null;
  children?: IMenu[];
}

export interface IMenuObject {
  id: number;
  key_menu: string;
  name: string;
  order_number: number;
  url: string | null;
  menu_id: number | null;
  active: string;
  created_by?: number | null;
  created_at: Date;
  updated_by?: number | null;
  updated_at: Date;
  children?: IMenuObject[];
}

export interface IMenuCreateData {
  key_menu: string;
  name: string;
  order_number: number;
  url?: string | null;
  menu_id?: number | null;
  active: string;
  created_by?: number | null;
}

export interface IMenuUpdateData {
  key_menu?: string;
  name?: string;
  url?: string | null;
  updated_by?: number | null;
}

export interface IMenuChangeParentData {
  menu_id?: number | null;
  order_number: number;
  updated_by?: number | null;
}

export interface IMenuSortData {
  order_number: number;
  updated_by?: number | null;
}

export interface IMenuActiveData {
  active: string;
  updated_by?: number | null;
}

export interface IMenuListResponse {
  data: IMenuObject[];
  total: number;
}

export interface IMenuNestedResponse {
  data: IMenuObject[];
}
