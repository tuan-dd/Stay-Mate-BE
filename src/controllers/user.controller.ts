import {
  BadRequestError,
  CreatedResponse,
  ForbiddenError,
  NotFoundError,
  SuccessResponse,
} from '@/helpers/utils';
import { KeyHeader } from '@/middleware/validate';
import { CreateUserSchema, UpdateUserSchema } from '@/schema/user.schema';
import userService from '@/services/user.service';
import UserService from '@/services/user.service';
import { getFilterData } from '@/utils/lodashUtil';
import { Response, Request } from 'express';

class UserController {
  createUser = async (req: Request<any, any, CreateUserSchema>, res: Response) => {
    const { email } = req.body;
    const userDb = await UserService.findOne({ email });

    if (userDb) throw new BadRequestError('User exit');

    const newUser = await UserService.createOne(req.body);

    new CreatedResponse({
      message: 'Create user successfully',
      data: getFilterData(['_id', 'name', 'email', 'role', 'avatar'], newUser),
    }).send(res);
  };

  updateUser = async (req: Request<any, any, UpdateUserSchema>, res: Response) => {
    const body = req.body;
    const { email } = req.user;
    const userId = req.headers[KeyHeader.USER_ID] as string;

    const userDb = await UserService.findByIdAndCheckPass(userId, body.password, {
      lean: true,
    });

    if (typeof userDb === 'boolean') throw new ForbiddenError('Wrong Password');

    if (email === userDb.email) throw new ForbiddenError('Wrong Email');

    Object.keys(body).forEach((key) => {
      userDb[key] = body[key];
    });

    await userDb.save();

    new SuccessResponse({
      message: 'update user successfully',
    }).send(res);
  };

  getMe = async (req: Request, res: Response) => {
    const email = req.user.email;
    const dataUser = await userService.findOne({ email });

    if (!dataUser) throw new NotFoundError('Not found user');

    new SuccessResponse({
      message: 'update user successfully',
      data: dataUser,
    }).send(res);
  };
}

const userController = new UserController();
export default userController;
