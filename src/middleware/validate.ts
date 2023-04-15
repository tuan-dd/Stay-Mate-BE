import { Response, NextFunction, Request } from 'express';
import { AnyObject, AnyObjectSchema, ObjectSchema } from 'yup';
import { HttpCode } from '@/utils/httpCode';
import { ReasonPhrases } from '@/utils/reasonPhrases';
import { Types } from 'mongoose';
import {
  BadRequestError,
  ForbiddenError,
  NotAuthorizedError,
  NotFoundError,
} from '@/helpers/utils';
import SecretKeyStoreService from '@/services/keyStore.service';
import UserService from '@/services/user.service';
import tokenUtil, { RequestUser } from '@/utils/tokenUtil';
import { Role } from '@/models/User';

declare module 'express-serve-static-core' {
  interface Request {
    user: RequestUser;
  }
}

export enum KeyHeader {
  USER_ID = 'x-client-id',
  REFRESH_TOKEN = 'x-rtoken-id',
  ACCESS_TOKEN = 'x-atoken-id',
}

// chưa hiểu mục đích của fn này
export const catchError = (fun: any) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fun(req, res, next)).catch(next);
  };
};

// check data in request
export const validateRequest =
  (schema: AnyObject) =>
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await schema.validate(
        {
          body: req.body,
          params: req.params,
          query: req.query,
        },
        { stripUnknown: true },
      );
      next();
    } catch (error: any) {
      error.httpCode = HttpCode.BAD_REQUEST;
      error.errorType = ReasonPhrases.BAD_REQUEST;
      next(error);
    }
  };

// check header have info need to use some router
export const checkUser = async (
  req: Request,
  _res: Response,
  next: NextFunction,
) => {
  const userId = req.headers[KeyHeader.USER_ID] as string;
  const accessToken = req.headers[KeyHeader.ACCESS_TOKEN] as string;
  const ip = req.ip;
  try {
    if (!userId) throw new BadRequestError('Header must have userId');

    if (!accessToken) throw new BadRequestError('Header must have access token');

    if (!Types.ObjectId.isValid(userId as string))
      throw new BadRequestError('UserId wrong');

    const userDb = await UserService.findById(userId);

    if (!userDb || !userDb.isActive) throw new NotFoundError('User not exit');

    const tokenStore = await SecretKeyStoreService.findTokenStore({
      userId,
      deviceId: ip,
    });

    if (!tokenStore) {
      // userDb.isActive = false;
      // await userDb.save();
      // await KeyStoresService.deleteALlTokenStores({ userId });

      throw new ForbiddenError('Your account is blocked, contact supporter');
    }

    const data = tokenUtil.verifyToken(accessToken, tokenStore.secretKey);

    if (!data) {
      throw new ForbiddenError('Wrong access token');
    }

    req.user = data as RequestUser;

    req.next();
  } catch (error) {
    next(error);
  }
};

export const checkParamsId = (
  req: Request,
  _res: Response,
  next: NextFunction,
) => {
  // const userId = req.params.id;

  // console.log(userId); // bị undefine

  if (!req.params?.id || !Types.ObjectId.isValid(req.params?.id))
    throw new NotFoundError('Params must have id');

  next();
  try {
  } catch (error) {
    next(error);
  }
};

export const checkRole =
  (role: Role) => (req: Request, _res: Response, next: NextFunction) => {
    if (req.user.role !== role)
      throw new NotAuthorizedError('you are not authorized');
    next();
    try {
    } catch (error) {
      next(error);
    }
  };
