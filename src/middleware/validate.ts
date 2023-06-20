import { Response, NextFunction, Request } from 'express';
import { ObjectSchema } from 'yup';
import { HttpCode } from '@/utils/httpCode';
import { ReasonPhrases } from '@/utils/reasonPhrases';
import {
  BadRequestError,
  ForbiddenError,
  NotAuthorizedError,
  NotFoundError,
} from '@/helpers/utils';
import SecretKeyStoreService from '@/services/keyStore.service';
import UserService from '@/services/user.service';
import tokenUtil, { DataAfterEncode } from '@/utils/tokenUtil';
import { ERole } from '@/models/User';
import { convertStringToObjectId, isValidObjectIdMongo } from '@/utils/otherUtil';
import { Types } from 'mongoose';

declare module 'express-serve-static-core' {
  interface Request {
    user: DataAfterEncode;
    userId: Types.ObjectId;
  }
}

export enum EKeyHeader {
  USER_ID = 'x-client-id',
  REFRESH_TOKEN = 'x-rtoken-id',
  ACCESS_TOKEN = 'x-atoken-id',
}

export const catchError =
  (fun: any) => (req: Request, res: Response, next: NextFunction) =>
    Promise.resolve(fun(req, res, next)).catch(next);

// check data in request
export const validateRequest =
  (schema: ObjectSchema<any>) =>
  async (req: Request, _res: Response, next: NextFunction) => {
    try {
      const result = await schema.validate(
        {
          body: req.body,
          params: req.params,
          query: req.query,
        },
        { stripUnknown: true },
      );

      if (result.query && Object.keys(result.query).length) {
        req.query = result.query;
      }

      if (result.body && Object.keys(result.body).length) {
        req.body = result.body;
      }
      if (result.params && Object.keys(result.params).length) {
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
  const userId = req.headers[EKeyHeader.USER_ID] as string;
  const accessToken = req.headers[EKeyHeader.ACCESS_TOKEN] as string;
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  const ipSave = (ip as string).split(', ');
  try {
    if (!userId) throw new BadRequestError('Header must have userId');

    if (!accessToken) throw new BadRequestError('Header must have access token');

    if (!isValidObjectIdMongo(userId as string))
      throw new BadRequestError('UserId wrong');

    const userDb = await UserService.findById(userId);

    if (!userDb || !userDb.isActive) throw new NotFoundError('User not exit');

    const tokenStore = await SecretKeyStoreService.findOne({
      userId: convertStringToObjectId(userId),
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
    req.userId = convertStringToObjectId(userId);
    req.user.name = userDb.name;

    next();
  } catch (error) {
    next(error);
  }
};

export const checkParamsId = (req: Request, _res: Response, next: NextFunction) => {
  if (!req.params?.id || !isValidObjectIdMongo(req.params?.id))
    throw new NotFoundError('Params must have id');

  next();
  try {
  } catch (error) {
    next(error);
  }
};

export const checkRole =
  (role: ERole) => (req: Request, _res: Response, next: NextFunction) => {
    if (req.user.role !== role && role === ERole.HOTELIER)
      throw new NotAuthorizedError(
        `You are not ${role}, create hotel to use this feature`,
      );

    if (req.user.role !== role) throw new NotAuthorizedError('You are not authorized');
    next();
  };
