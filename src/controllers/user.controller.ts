import {
  BadRequestError,
  CreatedResponse,
  ForbiddenError,
  NotFoundError,
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
import {
  getConvertCreatedAt,
  getDeleteFilter,
  getFilterData,
} from '@/utils/lodashUtil';
import pwdUtil from '@/utils/pwdUtil';
import { Response, Request } from 'express';
import { FilterQuery } from 'mongoose';

class UserController {
  createUser = async (
    req: Request<any, any, CreateUserSchema>,
    res: Response,
  ) => {
    const { email } = req.body;
    const userDb = await UserService.findOneUser({ email });

    if (userDb) throw new BadRequestError('User exit');

    const newUser = await UserService.createUser(req.body);

    new CreatedResponse({
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

      if (!isPwd) throw new ForbiddenError('Wrong Password');
    }

    Object.keys(body).forEach((key) => {
      userDb[key] = body[key];
    });

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

    if (!userDb) throw new NotFoundError('Not found user');

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
      throw new BadRequestError('cant not charge Money, contact support');

    new SuccessResponse({
      message: 'charge successfully',
    }).send(res);
  };

  queryUsers = async (
    req: Request<any, any, QueryUserSchema>,
    res: Response,
  ) => {
    let query: FilterQuery<UserDocument> = getDeleteFilter(
      ['page,limit'],
      req.body,
    );
    const page = req.body.page || 1;
    const limit = req.body.limit || 10;

    query = getConvertCreatedAt(query, ['name']);

    const users = await UserService.findUsers({
      query,
      page,
      limit,
    });

    if (!users) throw new NotFoundError('Not found user');

    new SuccessResponse({
      message: 'Get user`s data successfully',
      data: users,
    }).send(res);
  };

  detailUser = async (req: Request, res: Response) => {
    const id = req.params.id;

    const userDb = await UserService.findById(id);

    if (userDb.role === Role.HOTELIER) {
      const userDbByAggregate = await UserService.findUserByAggregate(id, {
        password: 0,
      });
      oke(userDbByAggregate);
    }

    if (userDb.role === Role.USER) {
      const userDbByFindOne = await UserService.findById(id);
      oke(userDbByFindOne);
    }

    function oke(value: any) {
      new SuccessResponse({
        message: 'Get user data successfully',
        data: value,
      }).send(res);
    }
  };
}

const userController = new UserController();

export default userController;
