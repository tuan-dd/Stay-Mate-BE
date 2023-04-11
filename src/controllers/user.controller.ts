import { BadRequest, Created } from '@/helpers/utils';
import {
  ChargeSchema,
  CreateUserSchema,
  QueryUserSchema,
  UpdateUserSchema,
  UpdateUserSchemaByAdmin,
  VerifyUserSchema,
} from '@/schema/user.schema';
import UserService from '@/services/user.service';
import { getFilterData } from '@/utils/lodashUtil';
import { Response, Request, NextFunction } from 'express';

class UserController {
  createUser = async (
    req: Request<any, any, CreateUserSchema>,
    res: Response,
  ) => {
    const { email } = req.body;
    const userDb = await UserService.findOneUser({ email });

    if (userDb) throw new BadRequest('User exit');

    const newUser = await UserService.createUser(req.body);

    new Created({
      message: 'Create user successfully',
      data: getFilterData(['_id', 'name', 'email', 'role', 'avatar'], newUser),
    }).send(res);
  };
  updateUser = async (
    req: Request<any, any, UpdateUserSchema>,
    res: Response,
  ) => {
    new Created({
      message: 'update user successfully',
    }).send(res);
  };
  updateByAdmin = async (
    req: Request<any, any, UpdateUserSchemaByAdmin>,
    res: Response,
  ) => {
    new Created({
      message: 'charge user successfully',
    }).send(res);
  };
  verifyUser = async (
    req: Request<any, any, VerifyUserSchema>,
    res: Response,
  ) => {
    new Created({
      message: 'verify user successfully',
    }).send(res);
  };
  chargeMoney = async (req: Request<any, any, ChargeSchema>, res: Response) => {
    new Created({
      message: 'charge successfully',
    }).send(res);
  };
  queryUsers = async (
    req: Request<any, any, QueryUserSchema>,
    res: Response,
  ) => {
    new Created({
      message: 'Get user`s data successfully',
    }).send(res);
  };
  detailUser = async (req: Request, res: Response) => {
    new Created({
      message: 'Get user`s data successfully',
    }).send(res);
  };
}

const userController = new UserController();

export default userController;
