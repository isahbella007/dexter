import bcrypt from 'bcrypt';
import { ErrorBuilder } from '../errors/ErrorBuilder';

export enum PasswordStrength {
  Weak = 'weak',
  Medium = 'medium',
  Strong = 'strong',
}

interface PasswordStrengthResult {
  strength: PasswordStrength;
  message: string;
}

export function checkPasswordStrength(
  password: string
): PasswordStrengthResult {
  if (password.length < 8) {
    return {
      strength: PasswordStrength.Weak,
      message: 'Password should be at least 8 characters long.',
    };
  }

  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasNonAlphas = /\W/.test(password);

  if (
    hasUpperCase &&
    hasLowerCase &&
    hasNumbers &&
    hasNonAlphas &&
    password.length >= 12
  ) {
    return {
      strength: PasswordStrength.Strong,
      message: 'Password strength is strong.',
    };
  } else if (
    (hasUpperCase || hasLowerCase) &&
    (hasNumbers || hasNonAlphas) &&
    password.length >= 8
  ) {
    return {
      strength: PasswordStrength.Medium,
      message: 'Password strength is medium.',
    };
  } else {
    return {
      strength: PasswordStrength.Weak,
      message:
        'Password is weak. Include uppercase, lowercase, numbers, and special characters.',
    };
  }
}

export async function hashPassword(password: string): Promise<{
  hash: string;
  salt: string;
}> {
  const strengthCheck = checkPasswordStrength(password);
  if (strengthCheck.strength === PasswordStrength.Weak) {
    throw ErrorBuilder.badRequest(strengthCheck.message);
  }

  const saltRounds = 12;
  const salt = await bcrypt.genSalt(saltRounds);
  const hash = await bcrypt.hash(password, salt);
  return {
    hash,
    salt,
  };
}

export function generateRandomPassword(length: number = 12): string {
  const charset =
    'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+~`|}{[]:;?><,./-=';
  let password = '';
  for (let i = 0, n = charset.length; i < length; ++i) {
    password += charset.charAt(Math.floor(Math.random() * n));
  }
  return password;
}
