import Joi from 'joi';

export const registerSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(8).required()
});

export const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
  mfaToken: Joi.string().optional(),
});

export const verifyEmailSchema = Joi.object({
  token: Joi.string().required(),
});

export const requestPasswordResetSchema = Joi.object({
  email: Joi.string().email().required(),
});

export const resetPasswordSchema = Joi.object({
  token: Joi.string().required(),
  newPassword: Joi.string().min(8).required(),
});

export const oauthMFATokenSchema = Joi.object({
  userId: Joi.string().required(),
  token: Joi.string().required(),
});

export const changePasswordSchema = Joi.object({
  currentPassword: Joi.string().required(),
  newPassword: Joi.string().required(),
});
export const setupMFASchema = Joi.object({
  userId: Joi.string().required()
});

export const verifyMFASetupSchema = Joi.object({
  token: Joi.number().required()
});

export const verifyMFALoginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
  mfaToken: Joi.string().length(6).required()
});