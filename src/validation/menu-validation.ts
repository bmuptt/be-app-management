import { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import { prismaClient } from '../config/database';
import { ResponseError } from '../config/response-error';
import { MenuService } from '../service/menu-service';

const baseSchema = z.object({
  key_menu: z
    .string({ message: `The key menu is required!` })
    .min(1, `The key menu is required!`),
  name: z
    .string({ message: `The name is required!` })
    .min(1, `The name is required!`),
});

const baseSchemaSort = z.object({
  list_menu: z
    .array(
      z.object({
        id: z.number({ message: `The id is required!` }),
      }), { message: `The list menu must contain more equal to than 1 item!` }
    )
    .min(1, 'The list menu must contain more equal to than 1 item!'),
});

export const validateStoreMenu = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    baseSchema.parse(req.body);

    req.body.key_menu = req.body.key_menu.toLowerCase();

    if (req.body.menu_id) {
      const menuParent = await prismaClient.menu.findUnique({
        where: {
          id: req.body.menu_id,
        },
      });

      if (!menuParent) {
        return next(new ResponseError(404, ['The parent menu is not found!']));
      }
    }

    const keyMenuExist = await prismaClient.menu.findFirst({
      where: {
        key_menu: req.body.key_menu,
      },
    });

    if (keyMenuExist) {
      return next(new ResponseError(400, ['The key menu cannot be the same!']));
    }

    next();
  } catch (e) {
    next(e);
  }
};

export const validateUpdateMenu = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    baseSchema.parse(req.body);

    req.body.key_menu = req.body.key_menu.toLowerCase();

    const dataExist = await MenuService.detail(parseInt(req.params.id));

    if (!dataExist)
      return next(new ResponseError(404, ['The menu does not exist!']));

    const keyMenuExist = await prismaClient.menu.findFirst({
      where: {
        AND: [
          {
            key_menu: req.body.key_menu,
          },
          {
            id: { not: parseInt(req.params.id) },
          },
        ],
      },
    });

    if (keyMenuExist) {
      return next(new ResponseError(400, ['The key menu cannot be the same!']));
    }

    next();
  } catch (e) {
    next(e);
  }
};

export const validateSortMenu = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    baseSchemaSort.parse(req.body);

    let menu_id = null;

    if (parseInt(req.params.id) !== 0) {
      menu_id = parseInt(req.params.id);
    }

    const checks = (req.body.list_menu as { id: number }[]).map(async ({ id }) => {
      const dataExist = await prismaClient.menu.findFirst({
        where: {
          id,
          menu_id,
        },
      });

      if (!dataExist) {
        throw new ResponseError(404, [`The menu with ID ${id} does not exist!`]);
      }
    });

    await Promise.all(checks);

    next();
  } catch (e) {
    next(e);
  }
};

export const validateChangeParent = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const menuId = parseInt(req.params.id);
    if (isNaN(menuId)) {
      return next(new ResponseError(404, ['The menu does not exist!']));
    }

    const dataExist = await MenuService.detail(menuId);

    if (!dataExist)
      return next(new ResponseError(404, ['The menu does not exist!']));

    if (req.body.menu_id) {
      const parentMenuId = parseInt(req.body.menu_id);
      if (isNaN(parentMenuId)) {
        return next(new ResponseError(404, ['The parent menu does not exist!']));
      }

      const dataParent = await MenuService.detail(parentMenuId);

      if (!dataParent)
        return next(new ResponseError(404, ['The parent menu does not exist!']));
    }
    next();
  } catch (e) {
    next(e);
  }
}

export const validateDeleteMenu = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const dataExist = await MenuService.detail(parseInt(req.params.id));

    if (!dataExist)
      return next(new ResponseError(404, ['The menu does not exist!']));
    next();
  } catch (e) {
    next(e);
  }
}
