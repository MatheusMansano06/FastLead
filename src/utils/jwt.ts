import jwt from 'jsonwebtoken';
import config from '../config/config';
import { AuthPayload } from '../types';

export const generateToken = (payload: AuthPayload): string => {
  return jwt.sign(
    payload,
    config.jwt.secret as string,
    {
      expiresIn: config.jwt.expiresIn,
    } as any
  );
};

export const generateRefreshToken = (payload: AuthPayload): string => {
  return jwt.sign(
    payload,
    config.jwt.refreshSecret as string,
    {
      expiresIn: config.jwt.refreshExpiresIn,
    } as any
  );
};

export const verifyToken = (token: string): AuthPayload | null => {
  try {
    const decoded = jwt.verify(token, config.jwt.secret) as AuthPayload;
    return decoded;
  } catch (error) {
    return null;
  }
};

export const verifyRefreshToken = (token: string): AuthPayload | null => {
  try {
    const decoded = jwt.verify(token, config.jwt.refreshSecret) as AuthPayload;
    return decoded;
  } catch (error) {
    return null;
  }
};

export const decodeToken = (token: string): AuthPayload | null => {
  try {
    const decoded = jwt.decode(token) as AuthPayload;
    return decoded;
  } catch (error) {
    return null;
  }
};
