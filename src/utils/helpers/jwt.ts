// src/utils/jwt.ts
import jwt from 'jsonwebtoken';
import { config } from '../../config';
import { IUser } from '../../models/User';


const JWT_SECRET = config.jwt.secret;

export function generateToken(user: IUser): string {
  return jwt.sign(
    {
      id: user._id,
      email: user.email,
    },
    JWT_SECRET,
    { expiresIn: config.jwt.expiresIn }
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function verifyToken(token: string): any {
  return jwt.verify(token, JWT_SECRET);
}
