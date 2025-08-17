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
