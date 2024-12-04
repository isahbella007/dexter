// src/utils/jwt.ts
import jwt from 'jsonwebtoken';
import { config } from '../../config';
import { IUser } from '../../models/User';
import { handleError } from './general';
import { ErrorBuilder } from '../errors/ErrorBuilder';
import dayjs from 'dayjs';
interface IJwtPayload {
  id: string; //this is the user id 
  exp: number;
  iat: number;
  email: string
}

const JWT_SECRET = config.jwt.secret;


export function generateToken(user: IUser): string {
  return jwt.sign(
    {
      id: user._id,
      email: user.email,
      iat: dayjs().unix(),
    },
    JWT_SECRET,
    {expiresIn: config.jwt.expiresIn}
  );
}

export function generateRefreshToken(user:IUser):string{ 
  return jwt.sign(
    {
      id: user._id,
      email: user.email,
      iat: dayjs().unix(),
    },
    config.jwt.refreshSecret,
    {expiresIn: config.jwt.refreshExpiresIn}
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function verifyToken(token: string): any {
  return jwt.verify(token, JWT_SECRET);
}

export const verifyRefreshToken = async(refreshToken: string, secret = config.jwt.refreshSecret) => { 
  // check if the refresh token is valid 
  const decoded = jwt.decode(refreshToken) as IJwtPayload | null

  if(!decoded){ throw ErrorBuilder.unauthorized('Invalid Token')}

  const refreshTokenTime = decoded?.exp

  const currentTime = Date.now() / 1000

  if(currentTime > refreshTokenTime) { throw ErrorBuilder.unauthorized('Token expired')}

  return jwt.verify(refreshToken, secret) as IJwtPayload
  
}