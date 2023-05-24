import {
  BadRequestError,
  CreatedResponse,
  ForbiddenError,
  NotFoundError,
  SuccessResponse,
} from '@/helpers/utils';
import { KeyHeader } from '@/middleware/validate';
import { UserDocument } from '@/models/User';
import { CreateUserSchema, UpdateUserSchema } from '@/schema/user.schema';
import userService from '@/services/user.service';
import UserService from '@/services/user.service';
import { getDeleteFilter } from '@/utils/lodashUtil';

import { Response, Request } from 'express';

class UserController {
  createUser = async (req: Request<any, any, CreateUserSchema>, res: Response) => {
    const { email } = req.body;
    const userDb = await UserService.findOne({ email });

    if (userDb) throw new BadRequestError('User exit');

    const newUser = await UserService.createOne(req.body);

    new CreatedResponse({
      message: 'Create user successfully',
      data: getDeleteFilter(['password', 'isActive'], newUser),
    }).send(res);
  };

  updateUser = async (req: Request<any, any, UpdateUserSchema>, res: Response) => {
    const body = req.body;
    const userId = req.headers[KeyHeader.USER_ID] as string;
    let userDb: UserDocument | boolean;
    if (body.password) {
      userDb = await UserService.findByIdAndCheckPass(userId, body.password, {
        lean: false,
      });

      body.password = body.newPassword;
    } else {
      userDb = (await UserService.findById(userId, null, {
        lean: false,
      })) as UserDocument;
    }

    if (typeof userDb === 'boolean') throw new ForbiddenError('Wrong Password');

    Object.keys(body).forEach((key) => {
      if (userDb[key]) {
        userDb[key] = body[key];
      }
    });

    await userDb.save();

    new SuccessResponse({
      message: 'Update user successfully',
    }).send(res);
  };

  getMe = async (req: Request, res: Response) => {
    const email = req.user.email;
    const dataUser = await userService.findOne({ email }, { password: 0 });

    if (!dataUser) throw new NotFoundError('Not found user');

    new SuccessResponse({
      message: 'Get current user successfully',
      data: dataUser,
    }).send(res);
  };
}

const userController = new UserController();
export default userController;
