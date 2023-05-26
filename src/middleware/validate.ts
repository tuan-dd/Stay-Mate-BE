import { Response, NextFunction, Request } from 'express';
import { AnyObject } from 'yup';
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
import tokenUtil, { DataAfterEncode } from '@/utils/tokenUtil';
import { Role } from '@/models/User';

declare module 'express-serve-static-core' {
  interface Request {
    user: DataAfterEncode;
  }
}

export enum KeyHeader {
  USER_ID = 'x-client-id',
  REFRESH_TOKEN = 'x-rtoken-id',
  ACCESS_TOKEN = 'x-atoken-id',
}

export const catchError = (fun: any) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fun(req, res, next)).catch(next);
  };
};

// check data in request
export const validateRequest =
  (schema: AnyObject) => async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await schema.validate({
        body: req.body,
        params: req.params,
        query: req.query,
      });

      if (Object.keys(result.query).length) {
        req.query = result.query;
      }
      if (Object.keys(result.body).length) {
        req.body = result.body;
      }
      if (Object.keys(result.params).length) {
        req.params = result.params;
      }

      next();
    } catch (error: any) {
      error.httpCode = HttpCode.BAD_REQUEST;
      error.errorType = ReasonPhrases.BAD_REQUEST;
      next(error);
    }
  };

// check header have info need to use some router
export const checkUser = async (req: Request, _res: Response, next: NextFunction) => {
  const userId = req.headers[KeyHeader.USER_ID] as string;
  const accessToken = req.headers[KeyHeader.ACCESS_TOKEN] as string;
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  const ipSave = (ip as string).split(', ');
  try {
    if (!userId) throw new BadRequestError('Header must have userId');

    if (!accessToken) throw new BadRequestError('Header must have access token');

    if (!Types.ObjectId.isValid(userId as string))
      throw new BadRequestError('UserId wrong');

    const userDb = await UserService.findById(userId);

    if (!userDb || !userDb.isActive) throw new NotFoundError('User not exit');

    const tokenStore = await SecretKeyStoreService.findOne({
      userId,
      deviceId: ipSave[0],
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

    req.user = data;
    req.user.name = userDb.name;

    next();
  } catch (error) {
    next(error);
  }
};

export const checkParamsId = (req: Request, _res: Response, next: NextFunction) => {
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
    if (req.user.role !== role) throw new NotAuthorizedError('you are not authorized');
    next();
  };
