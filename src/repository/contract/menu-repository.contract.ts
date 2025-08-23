import { PrismaClient, Prisma } from '@prisma/client';
import { 
  IMenuObject, 
  IMenuCreateData, 
  IMenuUpdateData, 
  IMenuChangeParentData,
  IMenuSortData,
  IMenuActiveData,
  IMenuListResponse,
  IMenuNestedResponse
} from '../../model/menu-model';
import { IRequestList } from '../../model/global-model';

export interface IMenuRepository {
  findMany(
    where: Prisma.MenuWhereInput, 
    orderBy: Prisma.MenuOrderByWithRelationInput[], 
    skip: number, 
    take: number
  ): Promise<IMenuObject[]>;
  
  findManyWithChildren(
    where: Prisma.MenuWhereInput, 
    orderBy: Prisma.MenuOrderByWithRelationInput[]
  ): Promise<IMenuObject[]>;
  
  count(where: Prisma.MenuWhereInput): Promise<number>;
  
  findUnique(id: number): Promise<IMenuObject | null>;
  
  findUniqueWithChildren(id: number): Promise<IMenuObject | null>;
  
  findFirstByParentId(menuId: number | null): Promise<IMenuObject | null>;
  
  findManyActive(): Promise<IMenuObject[]>;
  
  create(data: IMenuCreateData): Promise<IMenuObject>;
  
  update(id: number, data: IMenuUpdateData): Promise<IMenuObject>;
  
  updateActive(id: number, data: IMenuActiveData): Promise<IMenuObject>;
  
  changeParent(id: number, data: IMenuChangeParentData): Promise<IMenuObject>;
  
  sortMenus(menus: { id: number; order_number: number; updated_by?: number | null }[]): Promise<void>;
  
  deleteWithTransaction(id: number, updatedBy: number): Promise<IMenuObject>;
  
  deleteRoleMenus(menuId: number): Promise<void>;
}
