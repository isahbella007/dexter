// src/utils/jwt.ts
import jwt from 'jsonwebtoken';
import { config } from '../../config';
import { handleError } from './general';
import { ErrorBuilder } from '../errors/ErrorBuilder';
import dayjs from 'dayjs';
import { IUser } from '../../models/interfaces/UserInterface';
import { User } from '../../models/User';
import { dateUtils } from './date';
interface IJwtPayload {
  id: string; //this is the user id 
  exp: number;
  iat: number;
  email: string
  tokenVersion: number;
}

const JWT_SECRET = config.jwt.secret;


export function generateToken(user: IUser): string {
  return jwt.sign(
    {
      id: user._id,
      email: user.email,
      tokenVersion: user.tokenVersion,
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
      tokenVersion: user.tokenVersion,
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

  if(currentTime > refreshTokenTime) { throw ErrorBuilder.unauthorized('Refresh Token expired')}

  const user = await User.findById(decoded.id);
  if (!user) {
      throw ErrorBuilder.unauthorized('User not found');
  }

  // Check if token version matches current user version
  if (user.tokenVersion !== decoded.tokenVersion) {
    throw ErrorBuilder.unauthorized(
        'Token version mismatch. You must have signed out from all devices. Sign in again'
    );
}

  return jwt.verify(refreshToken, secret) as IJwtPayload
  
}

export const verifyHubSpotToken = (exp: Date) => { 
  const currentTime = dateUtils.getCurrentUTCDate()
  return exp < currentTime //return true if the token is expired

}
