import {
  AppError,
  BadRequest,
  ForBidden,
  NotAuthorizedError,
  NotFound,
  SuccessResponse,
} from '@/helpers/utils';
import { sendMail } from '@/utils/sendEmail';
import { Response, Request } from 'express';
import crypto from 'crypto';
import { SigninSchema } from '@/schema/auth.schema';
import UserService from '@/services/user.service';
import pwdUtil from '@/utils/pwdUtil';
import { OtpSchema } from '@/schema/otp.schema';
import KeyStoresService from '@/services/keyStore.service';
import client from '@/database/init.redisDb';
import tokenUtil, { DataAfterEncode } from '@/utils/tokenUtil';
import { Role } from '@/models/User';
import { KeyHeader } from '@/middleware/validate';
import SecretKeyStoreService from '@/services/keyStore.service';
import { Types } from 'mongoose';
import { HttpCode } from '@/utils/httpCode';
import { ReasonPhrases } from '@/utils/reasonPhrases';
import { getLogger } from 'log4js';
export interface CustomRequest extends Request {
  user: {
    email: string;
    role: Role;
  };
}
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

    const userDb = await UserService.findOneUser({ email });

    if (!userDb || !userDb.isActive) throw new NotFound('User not exist');

    const comparePwd = await pwdUtil.getCompare(password, userDb.password);

    if (!comparePwd) new ForBidden('Wrong password');

    const sixCode = crypto.randomInt(100_000, 999_999).toString();
    // const a = userDb._id.toHexString();
    const hashSixCode = await pwdUtil.getHash(sixCode.toString(), 10);

    await client.HSET(userDb._id.toHexString(), [
      'sixCode',
      hashSixCode,
      'number',
      5,
      'ip',
      ip,
    ]);
    await client.expire(userDb._id.toString(), 60);

    // const createOtp = await OtpService.createOtp({ email, sixCode });

    sendMail({
      from: '<huynh.atuan.97@gmail.com>',
      to: `${email}`,
      subject: 'Hello ✔',
      text: ` Hello ${email} `,
      html: `<b>${sixCode}</b>`,
    })
      .then(() =>
        new SuccessResponse({
          message: 'Send code to email successfully',
        }).send(res),
      )
      .catch((error) => {
        getLogger('Send Email Error').error(error);

        throw new AppError(
          'can`t not send email',
          HttpCode.BAD_REQUEST,
          ReasonPhrases.BAD_REQUEST,
        );
      });

    // console.log(sixCode);

    // new SuccessResponse({
    //   message: 'Send code to email successfully',
    // }).send(res);
  };
  authCode = async (req: Request<any, any, OtpSchema>, res: Response) => {
    /**
     * @check check six code
     * @create accessToken,refreshToken,secretKey
     * @save save db
     * @send client
     */
    const { sixCode, email } = req.body;

    const ip = req.ip;
    // const idAddress_2 = req.headers['x-forwarded-for'];

    const userDb = await UserService.findOneUser(
      { email },
      { email: 1, role: 1 },
    );

    if (!userDb || !userDb.isActive) throw new NotFound('User not exist');

    if (email !== userDb.email) throw new ForBidden('Wrong users');

    const userRedis = await client.hGetAll(userDb._id.toHexString());

    if (!userRedis) throw new BadRequest('Otp expires');

    if (userRedis.ip !== ip) {
      await client.del(userDb._id.toHexString());
      throw new ForBidden('You are not in current device');
    }

    if (parseInt(userRedis.sixCode) === 0) {
      await client.del(userDb._id.toHexString());
      throw new ForBidden('no guess, try sign in again');
    }
    const isValid = await pwdUtil.getCompare(
      sixCode.toString(),
      userRedis.sixCode,
    );

    if (parseInt(userRedis.sixCode) === 1) {
      await client.del(userDb._id.toHexString());
      throw new ForBidden('wrong otp and no guess, try sign in again');
    }

    if (!isValid) {
      await client.hIncrBy(userDb._id.toHexString(), 'number', -1);
      throw new ForBidden(
        `wrong Code, you have ${parseInt(userRedis.number) - 1}`,
      );
    }

    await client.del(userDb._id.toHexString());

    const secretKey = crypto.randomBytes(32).toString('hex');

    const { accessToken, refreshToken } = tokenUtil.createTokenPair(
      { email: userDb.email, role: userDb.role },
      secretKey,
    );

    // prevent duplicate same deviceId
    const update = await KeyStoresService.findOneUpdateTokenStore(userDb._id, {
      refreshToken,
      secretKey,
      userId: userDb._id,
      deviceId: ip,
    });

    if (!update)
      await KeyStoresService.createStore({
        refreshToken,
        secretKey,
        userId: userDb._id,
        deviceId: ip,
      });

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

    if (!userId) throw new BadRequest('Header must have userId');

    if (!refreshToken) throw new BadRequest('Header must have access token');

    if (!Types.ObjectId.isValid(userId as string))
      throw new NotFound('UserId wrong');

    const tokenStore = await SecretKeyStoreService.findTokenStore(
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

      throw new ForBidden('Your account is blocked, contact supporter');
    }

    if (refreshToken !== tokenStore.refreshToken) {
      throw new ForBidden('Wrong refresh Token');
    }
    const payLoad = tokenUtil.verifyToken(refreshToken, tokenStore.secretKey);

    if (typeof payLoad === 'boolean')
      throw new ForBidden('Wrong refresh Token');

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
      message: 'send new access token',
      data: newAccessToken,
    }).send(res);
  };
}

const authController = new AuthController();
export default authController;
