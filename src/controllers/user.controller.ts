import {
  BadRequestError,
  CreatedResponse,
  ForbiddenError,
  SuccessResponse,
} from '@/helpers/utils';
import { CreateUserSchema, UpdateUserSchema } from '@/schema/user.schema';
import UserService from '@/services/user.service';
import { getFilterData } from '@/utils/lodashUtil';
import pwdUtil from '@/utils/pwdUtil';
import { Response, Request } from 'express';

class UserController {
  createUser = async (
    req: Request<any, any, CreateUserSchema>,
    res: Response,
  ) => {
    const { email } = req.body;
    const userDb = await UserService.findOneUser({ email });

    if (userDb) throw new BadRequestError('User exit');

    const newUser = await UserService.createOne(req.body);

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
}

const userController = new UserController();

export default userController;
