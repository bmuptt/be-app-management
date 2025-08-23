// Repository Contracts
export { IUserRepository } from './contract/user-repository.contract';
export { IAuthRepository } from './contract/auth-repository.contract';
export { IAccessTokenRepository } from './contract/access-token-repository.contract';
export { IRoleRepository } from './contract/role-repository.contract';
export { IMenuRepository } from './contract/menu-repository.contract';
export { IRoleMenuRepository } from './contract/role-menu-repository.contract';

// Repository Implementations
export { UserRepository } from './impl/user-repository.impl';
export { AuthRepository } from './impl/auth-repository.impl';
export { AccessTokenRepository } from './impl/access-token-repository.impl';
export { RoleRepository } from './impl/role-repository.impl';
export { MenuRepository } from './impl/menu-repository.impl';
export { RoleMenuRepository } from './impl/role-menu-repository.impl';

// Repository Instances
import { UserRepository } from './impl/user-repository.impl';
import { AuthRepository } from './impl/auth-repository.impl';
import { AccessTokenRepository } from './impl/access-token-repository.impl';
import { RoleRepository } from './impl/role-repository.impl';
import { MenuRepository } from './impl/menu-repository.impl';
import { RoleMenuRepository } from './impl/role-menu-repository.impl';

export const userRepository = new UserRepository();
export const authRepository = new AuthRepository();
export const accessTokenRepository = new AccessTokenRepository();
export const roleRepository = new RoleRepository();
export const menuRepository = new MenuRepository();
export const roleMenuRepository = new RoleMenuRepository();
