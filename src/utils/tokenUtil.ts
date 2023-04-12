import { Role } from '@/models/User';
import JWT from 'jsonwebtoken';

export interface PayLoad {
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
