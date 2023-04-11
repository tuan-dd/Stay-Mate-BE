import { Response, NextFunction, Request } from 'express';
import { AnyObject, AnyObjectSchema } from 'yup';
import { HttpCode } from '@/utils/httpCode';
import { ReasonPhrases } from '@/utils/reasonPhrases';
import { TypeKeyBaseType, Types } from 'mongoose';
import {
  BadRequest,
  ForBidden,
  NotAuthorizedError,
  NotFound,
} from '@/helpers/utils';
import SecretKeyStoreService from '@/services/keyStore.service';
import UserService from '@/services/user.service';
import { TypeSecretKeyStore } from '@/models/SecretKeyStore';
import tokenUtil, { PayLoad } from '@/utils/tokenUtil';
import { Role } from '@/models/User';

export interface CustomRequest extends Request {
  user: PayLoad;
}

export enum KeyHeader {
  USER_ID = 'x-client-id',
  'REFRESH_TOKEN' = 'x-rtoken-id',
  'ACCESS_TOKEN' = 'x-atoken-id',
}
export const catchError = (fun: any) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fun(req, res, next)).catch(next);
  };
};

export const getIpMiddleware =
  (schema: AnyObject) =>
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await schema.validate({
        body: req.body,
        params: req.params,
        query: req.query,
      });
      next();
    } catch (error: any) {
      error.statusCode = HttpCode.BAD_REQUEST;
      error.errorType = ReasonPhrases.BAD_REQUEST;
      next(error);
    }
  };

export const validateRequest =
  (schema: AnyObject) =>
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await schema.validate({
        body: req.body,
        params: req.params,
        query: req.query,
      });
      next();
    } catch (error: any) {
      error.httpCode = HttpCode.BAD_REQUEST;
      error.errorType = ReasonPhrases.BAD_REQUEST;
      next(error);
    }
  };

export const checkUser = async (
  req: CustomRequest,
  _res: Response,
  next: NextFunction,
) => {
  const userId = req.headers[KeyHeader.USER_ID] as string;
  const accessToken = req.headers[KeyHeader.ACCESS_TOKEN] as string;
  const ip = req.ip;
  try {
    if (!userId) throw new BadRequest('Header must have userId');

    if (!accessToken) throw new BadRequest('Header must have access token');

    if (!Types.ObjectId.isValid(userId as string))
      throw new NotFound('UserId wrong');

    const userDb = await UserService.findById(userId);

    if (!userDb || !userDb.isActive) throw new NotFound('User not exit');

    const tokenStore = await SecretKeyStoreService.findTokenStore({
      userId,
      deviceId: ip,
    });

    // if (!tokenStores.length) throw new NotFound(' Logged out user ');

    // let tokenStore: TypeSecretKeyStore;

    // const checkId = tokenStores.some((e, i) => {
    //   if (e.deviceId === ip) tokenStore = tokenStores[i];
    //   return e.deviceId === ip;
    // });
    if (!tokenStore) {
      // userDb.isActive = false;
      // await userDb.save();
      // await KeyStoresService.deleteALlTokenStores({ userId });

      throw new ForBidden('Your account is blocked, contact supporter');
    }

    const data = tokenUtil.verifyToken(accessToken, tokenStore.secretKey);

    if (!data) {
      throw new NotAuthorizedError('Wrong access token');
    }

    req.user = data as CustomRequest['user'];

    next();
  } catch (error) {
    next(error);
  }
};

export const checkParamsId = (
  req: Request,
  _res: Response,
  next: NextFunction,
) => {
  const keys = Object.values(req.params);
  if (keys.includes('id') && !req.params?.id)
    throw new NotFound('Params must have id');
  try {
  } catch (error) {
    next(error);
  }
};
