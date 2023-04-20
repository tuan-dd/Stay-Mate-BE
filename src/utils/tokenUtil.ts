import { Role } from '@/models/User';
import JWT from 'jsonwebtoken';

export interface PayLoadInToken {
  email: string;
  role: Role;
}

export interface DataAfterEncode extends JWT.JwtPayload {
  email: string;
  role: Role;
  name?: string;
}

const createTokenPair = (PayLoadInToken: PayLoadInToken, secretKey: string) => {
  const accessToken = JWT.sign(PayLoadInToken, secretKey, {
    expiresIn: '3 day',
  });
  const refreshToken = JWT.sign(PayLoadInToken, secretKey, {
    expiresIn: '7 day',
  });

  return { accessToken, refreshToken };
};

const createToken = (
  PayLoadInToken: PayLoadInToken,
  secretKey: string,
  expires: string | number,
) => {
  return JWT.sign(PayLoadInToken, secretKey, { expiresIn: expires });
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
