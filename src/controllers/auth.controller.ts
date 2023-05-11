import {
  BadRequestError,
  ForbiddenError,
  NotFoundError,
  SuccessResponse,
} from '@/helpers/utils';
import { sendMail } from '@/utils/sendEmail';
import { Response, Request } from 'express';
import crypto from 'crypto';
import { SigninSchema } from '@/schema/auth.schema';
import userService from '@/services/user.service';

import pwdUtil from '@/utils/pwdUtil';
import KeyStoresService from '@/services/keyStore.service';
import tokenUtil from '@/utils/tokenUtil';
import { KeyHeader } from '@/middleware/validate';
import SecretKeyStoreService from '@/services/keyStore.service';
import { Types } from 'mongoose';
import { getLogger } from 'log4js';
import redisUtil from '@/utils/redisUtil';
import { OtpSchema } from '@/schema/otp.schema';
class AuthController {
  signIn = async (req: Request<any, any, SigninSchema>, res: Response) => {
    /**
     * @check code user
     * @create createOtp
     * @save save db limit time
     * @send send code to email
     */
    const { password, email } = req.body;
    const ip = req.ip;

    const userDb = await userService.findOne({ email });

    if (!userDb || !userDb.isActive) throw new NotFoundError('User not exist');

    const comparePwd = await pwdUtil.getCompare(password, userDb.password);

    if (!comparePwd) throw new ForbiddenError('Wrong password');

    const sixCode = crypto.randomInt(100_000, 999_999).toString();
    // const a = userDb._id.toHexString();
    const hashSixCode = await pwdUtil.getHash(sixCode.toString(), 10);

    await redisUtil.hSet(userDb._id.toHexString(), [
      'sixCode',
      hashSixCode,
      'number',
      5,
      'ip',
      ip,
    ]);
    await redisUtil.expire(userDb._id.toString(), 60 * 4);

    await sendMail(sixCode, email)
      .then(() =>
        new SuccessResponse({
          message: 'Send code to email successfully',
        }).send(res),
      )
      .catch((error) => {
        getLogger('Send Email Error').error(error);

        throw new BadRequestError('Can`t not send email');
      });
  };

  authCode = async (req: Request<any, any, OtpSchema>, res: Response) => {
    /**
     * @check check six code
     * @create accessToken,refreshToken,secretKey
     * @save save db
     * @send redisUtil
     */
    const { sixCode, email } = req.body;

    const ip = req.ip;
    // const idAddress_2 = req.headers['x-forwarded-for'];

    const userDb = await userService.findOne({ email }, { password: 0 });

    if (!userDb || !userDb.isActive) throw new NotFoundError('User not exist');

    if (email !== userDb.email) throw new ForbiddenError('Wrong users');

    const userRedis = await redisUtil.hGetAll(userDb._id.toHexString());

    if (!userRedis) throw new BadRequestError('Otp expires');

    if (userRedis.ip !== ip) {
      await redisUtil.deleteKey(userDb._id.toHexString());
      throw new ForbiddenError('You are not in current device');
    }

    if (parseInt(userRedis.sixCode, 10) === 0) {
      await redisUtil.deleteKey(userDb._id.toHexString());
      throw new ForbiddenError('no guess, try sign in again');
    }
    const isValid = await pwdUtil.getCompare(sixCode.toString(), userRedis.sixCode);

    if (parseInt(userRedis.sixCode, 10) === 1) {
      await redisUtil.deleteKey(userDb._id.toHexString());
      throw new ForbiddenError('wrong otp and no guess, try sign in again');
    }

    if (!isValid) {
      await redisUtil.hIncrBy(userDb._id.toHexString(), 'number', -1);
      throw new ForbiddenError(
        `wrong Code, you have ${parseInt(userRedis.number, 10) - 1}`,
      );
    }

    await redisUtil.deleteKey(userDb._id.toHexString());

    const secretKey = crypto.randomBytes(32).toString('hex');

    const { accessToken, refreshToken } = tokenUtil.createTokenPair(
      { email: userDb.email, role: userDb.role },
      secretKey,
    );

    // prevent duplicate same deviceId
    await KeyStoresService.findOneUpdate(
      { userId: userDb._id, deviceId: ip },
      {
        $set: {
          refreshToken,
          secretKey,
        },
      },
      {
        new: true,
        upsert: true,
      },
    );

    res
      .cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: false,
        path: '/',
        sameSite: 'strict',
      })
      .cookie('accessToken', accessToken, {
        httpOnly: true,
        secure: false,
        path: '/',
        sameSite: 'strict',
      });
    // console.log(accessToken);
    new SuccessResponse({
      data: userDb,
      message: 'Login successfully',
    }).send(res);
  };

  signOut = async (req: Request, res: Response) => {
    const ip = req.ip;
    const userId = req.headers[KeyHeader.USER_ID];

    const objectId = new Types.ObjectId(userId as string);

    await SecretKeyStoreService.deleteTokenStore({
      userId: objectId,
      deviceId: ip,
    });

    res
      .cookie('refreshToken', null, {
        maxAge: 0,
      })
      .cookie('accessToken', null, {
        maxAge: 0,
      });

    new SuccessResponse({
      message: 'Sign out successfully',
    }).send(res);
  };

  getNewAccessToken = async (req: Request, res: Response) => {
    const userId = req.headers[KeyHeader.USER_ID] as string;
    const refreshToken = req.headers[KeyHeader.REFRESH_TOKEN] as string;
    const ip = req.ip;

    if (!userId) throw new BadRequestError('Header must have userId');

    if (!refreshToken) throw new BadRequestError('Header must have access token');

    if (!Types.ObjectId.isValid(userId as string)) {
      throw new NotFoundError('UserId wrong');
    }

    const tokenStore = await SecretKeyStoreService.findOne(
      {
        userId,
        deviceId: ip,
      },
      { lean: false },
    );

    if (!tokenStore) {
      // userDb.isActive = false;
      // await userDb.save();
      // await KeyStoresService.deleteALlTokenStores({ userId });

      throw new ForbiddenError('Your account is blocked, contact supporter');
    }

    if (refreshToken !== tokenStore.refreshToken) {
      throw new ForbiddenError('Wrong refresh Token');
    }
    const payLoad = tokenUtil.verifyToken(refreshToken, tokenStore.secretKey);

    if (typeof payLoad === 'boolean') throw new ForbiddenError('Wrong refresh Token');

    const newAccessToken = tokenUtil.createToken(
      {
        email: payLoad.email,
        role: payLoad.role,
      },
      tokenStore.secretKey,
      '3day',
    );

    res.cookie('accessToken', newAccessToken, {
      httpOnly: true,
      secure: false,
      path: '/',
      sameSite: 'strict',
    });
    new SuccessResponse({
      message: 'Send new access token',
      data: newAccessToken,
    }).send(res);
  };
}

const authController = new AuthController();
export default authController;
