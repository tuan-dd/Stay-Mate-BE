import {
  BadRequest,
  Created,
  ForBidden,
  NotFound,
  SuccessResponse,
} from '@/helpers/utils';
import { Role, UserDocument } from '@/models/User';
import {
  ChargeSchema,
  CreateUserSchema,
  QueryUserSchema,
  UpdateUserSchema,
  UpdateUserSchemaByAdmin,
} from '@/schema/user.schema';
import UserService from '@/services/user.service';
import { getFilterData } from '@/utils/lodashUtil';
import pwdUtil from '@/utils/pwdUtil';
import { Response, Request } from 'express';
import { FilterQuery, QueryOptions } from 'mongoose';

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
    const body = req.body;
    const { email } = req.user;

    const userDb = await UserService.findOneUser({ email }, { lean: false });

    if (body.password) {
      const isPwd = await pwdUtil.getCompare(body.password, userDb.password);

      if (!isPwd) throw new ForBidden('Wrong Password');
    }

    Object.keys(body).forEach((key) => {
      userDb[key] = body[key];
    });
    // console.log(userDb);

    await userDb.save();

    new SuccessResponse({
      message: 'update user successfully',
      data: getFilterData(['email', 'avatar', 'name'], userDb),
    }).send(res);
  };

  updateByAdmin = async (
    req: Request<any, any, UpdateUserSchemaByAdmin>,
    res: Response,
  ) => {
    const userId = req.params.id;
    const isActive = req.body.isActive;

    const userDb = await UserService.findById(userId, { lean: false });

    if (!userDb) throw new NotFound('Not found user');

    userDb.isActive = isActive;

    await userDb.save();

    new SuccessResponse({
      message: 'charge user successfully',
    }).send(res);
  };

  chargeMoney = async (req: Request<any, any, ChargeSchema>, res: Response) => {
    const balance = req.body.balance;
    const email = req.user.email;

    const updateBalance = await UserService.findOneUserUpdate(
      { email },
      { $inc: { balance: balance } },
    );

    if (!updateBalance)
      throw new BadRequest('cant not charge Money, contact support');

    new SuccessResponse({
      message: 'charge successfully',
    }).send(res);
  };

  queryUsers = async (
    req: Request<any, any, QueryUserSchema>,
    res: Response,
  ) => {
    const body = req.body;
    const query: FilterQuery<UserDocument> = {
      email: body.email,
      name: body.name,
      role: body.role,
      createdAt: { $gte: body.createdAt },
      createdAt_gte: body.createdAt_gte,
      createdAt_lte: body.createdAt_lte,
    };

    const page = req.body.page || 1;
    const limit = req.body.limit || 20;

    const isCreatedAt = ['createdAt_gte', 'createdAt_lte'];

    const convertDate = (key: '$gte' | '$lte') => {
      if (key === '$gte') {
        query.createdAt = {
          ...query.createdAt,
          [key]: query.createdAt_gte,
        };

        delete query.createdAt_gte;
      } else {
        query.createdAt = {
          ...query.createdAt,
          [key]: query.createdAt_lte,
        };

        delete query.createdAt_lte;
      }
    };

    Object.keys(query).forEach((key) => {
      if (!query[key]) delete query[key];

      // RegExp like string.includes('abc')
      if (key === 'name' && query[key]) {
        const regExp = new RegExp(query.name, 'i');
        query.name = regExp;
      }

      if (isCreatedAt.includes(key) && query[key]) {
        key === 'createdAt_gte' ? convertDate('$gte') : convertDate('$lte');
      }
    });

    const users = await UserService.findUsers({ query, page, limit });

    if (!users) throw new NotFound('Not found user');

    new SuccessResponse({
      message: 'Get user`s data successfully',
      data: users,
    }).send(res);
  };

  detailUser = async (req: Request, res: Response) => {
    const id = req.params.id;
    const role = req.user.role;

    if (role === Role.HOTELIER) {
      const userDbByAggregate = await UserService.findUserByAggregate(id, {
        password: 0,
      });
      return new SuccessResponse({
        message: 'Get user data successfully',
        data: userDbByAggregate,
      }).send(res);
    }

    if (role === Role.USER) {
      const userDbByFindOne = await UserService.findById(id);
      return new SuccessResponse({
        message: 'Get user data successfully',
        data: userDbByFindOne,
      }).send(res);
    }
  };
}

const userController = new UserController();

export default userController;
