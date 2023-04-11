import { CustomRequest } from '@/middleware/validate';
import { Role } from '@/models/User';
import { ifError } from 'assert';
import { error } from 'console';
import JWT from 'jsonwebtoken';
import { boolean } from 'yup';

export interface PayLoad {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  email: string;
  role: Role;
}

export interface DataAfterEncode extends JWT.JwtPayload {
  email: string;
  role: Role;
}

const createTokenPair = (payload: PayLoad, secretKey: string) => {
  const accessToken = JWT.sign(payload, secretKey, { expiresIn: '3 day' });
  const refreshToken = JWT.sign(payload, secretKey, { expiresIn: '7 day' });

  return { accessToken, refreshToken };
};

const createToken = (
  payload: PayLoad,
  secretKey: string,
  expires: string | number,
) => {
  return JWT.sign(payload, secretKey, { expiresIn: expires });
};

const verifyToken = (
  token: string,
  secretKey: string,
): DataAfterEncode | false => {
  try {
    const decodedToken = JWT.verify(token, secretKey);
    return decodedToken as DataAfterEncode;
  } catch (err) {
    return false;
  }
};

export default { createTokenPair, verifyToken, createToken } as const;
