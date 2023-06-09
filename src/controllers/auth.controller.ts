import {
  BadRequestError,
  ForbiddenError,
  NotFoundError,
  SuccessResponse,
} from '@/helpers/utils';
import { sendMail } from '@/utils/sendEmail';
import { Response, Request } from 'express';
import crypto from 'crypto';
import { SignInSchema } from '@/schema/auth.schema';
import userService from '@/services/user.service';
import pwdUtil from '@/utils/pwdUtil';
import KeyStoresService from '@/services/keyStore.service';
import tokenUtil from '@/utils/tokenUtil';
import { EKeyHeader } from '@/middleware/validate';
import SecretKeyStoreService from '@/services/keyStore.service';
import { getLogger } from 'log4js';
import redisUtil from '@/utils/redisUtil';
import { OtpSchema } from '@/schema/otp.schema';
import { convertStringToObjectId, isValidObjectIdMongo } from '@/utils/otherUtil';
class AuthController {
  signIn = async (req: Request<any, any, SignInSchema>, res: Response) => {
    /**
     * @check code user
     * @create createOtp
     * @save save db limit time
     * @send send code to email
     */
    const { password, email } = req.body;
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

    const userDb = await userService.findOne({ email });

    if (!userDb || !userDb.isActive) throw new NotFoundError('User not exist');

    const comparePwd = await pwdUtil.getCompare(password, userDb.password);

    if (!comparePwd) throw new ForbiddenError('Wrong password');

    const sixCode = crypto.randomInt(100_000, 999_999).toString();

    const hashSixCode = await pwdUtil.getHash(sixCode, 10);
    const ipSave = (ip as string).split(', ');

    await redisUtil.hSet(userDb._id.toHexString(), [
      'sixCode',
      hashSixCode,
      'number',
      5,
      'ip',
      ipSave[0],
    ]);
    await redisUtil.expire(userDb._id.toString(), 60 * 5);

    sendMail(sixCode, email)
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
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

    const userDb = await userService.findOne(
      { email, isActive: true },
      { password: 0, isActive: 0 },
    );

    if (!userDb) throw new NotFoundError('User not exist');

    if (email !== userDb.email) throw new ForbiddenError('Wrong users');

    const userRedis = await redisUtil.hGetAll(userDb._id.toHexString());

    if (!Object.keys(userRedis).length) throw new BadRequestError('Otp expires');

    const number = parseInt(userRedis.number, 10);

    if (!ip.includes(userRedis.ip)) {
      await redisUtil.deleteKey(userDb._id.toHexString());
      throw new ForbiddenError('You are not in current device');
    }

    const isValid = await pwdUtil.getCompare(sixCode.toString(), userRedis.sixCode);

    if (!isValid) {
      if (number === 1) {
        await redisUtil.deleteKey(userDb._id.toHexString());
        throw new ForbiddenError('No guess, try sign in again');
      }

      await redisUtil.hIncrBy(userDb._id.toHexString(), 'number', -1);
      throw new ForbiddenError(`wrong Code, you have ${number - 1}`);
    }

    await redisUtil.deleteKey(userDb._id.toHexString());

    const secretKey = crypto.randomBytes(32).toString('hex');

    const { accessToken, refreshToken } = tokenUtil.createTokenPair(
      { email: userDb.email, role: userDb.role },
      secretKey,
    );
    const ipSave = (ip as string).split(', ');

    // prevent duplicate same deviceId
    await KeyStoresService.findOneUpdate(
      { userId: userDb._id, deviceId: ipSave[0] },
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

    new SuccessResponse({
      data: { ...userDb, accessToken, refreshToken },
      message: 'Login successfully',
    }).send(res);
  };

  signOut = async (req: Request, res: Response) => {
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const ipSave = (ip as string).split(', ');
    const userId = req.headers[EKeyHeader.USER_ID];

    const objectId = convertStringToObjectId(userId as string);

    await SecretKeyStoreService.deleteTokenStore({
      userId: objectId,
      deviceId: ipSave[0],
    });

    new SuccessResponse({
      message: 'Sign out successfully',
    }).send(res);
  };

  getNewAccessToken = async (req: Request, res: Response) => {
    const userId = req.headers[EKeyHeader.USER_ID] as string;
    const refreshToken = req.headers[EKeyHeader.REFRESH_TOKEN] as string;
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const ipSave = (ip as string).split(', ');

    if (!userId) throw new BadRequestError('Header must have userId');

    if (!refreshToken) throw new BadRequestError('Header must have access token');

    if (isValidObjectIdMongo(userId as string)) {
      throw new NotFoundError('UserId wrong');
    }

    const tokenStore = await SecretKeyStoreService.findOne(
      {
        userId,
        deviceId: ipSave[0],
      },
      { lean: false },
    );

    if (!tokenStore) {
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
      '1day',
    );

    new SuccessResponse({
      message: 'Send new access token',
      data: newAccessToken,
    }).send(res);
  };

  getNewPassWord = async (req: Request, res: Response) => {
    const email = req.body.email;
    const sixCode = crypto.randomInt(100_000, 999_999).toString();
    const hashSixCode = await pwdUtil.getHash(sixCode, 10);

    const userDb = await userService.findOneUpdate(
      { email },
      { $set: { password: hashSixCode } },
    );

    if (!userDb) throw new NotFoundError('Not found user');

    await sendMail(sixCode, email, 'New Password')
      .then(() =>
        new SuccessResponse({
          message: 'Send new password to email successfully',
        }).send(res),
      )
      .catch((error) => {
        getLogger('Send Email Error').error(error);

        throw new BadRequestError('Can`t not send email');
      });
  };
}

const authController = new AuthController();
export default authController;
