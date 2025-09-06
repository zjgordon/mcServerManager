import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { logger } from '../config/logger';

// Password security configuration
const SALT_ROUNDS = 12;
const MIN_PASSWORD_LENGTH = 8;
const MAX_PASSWORD_LENGTH = 128;

// Password complexity requirements
const PASSWORD_REQUIREMENTS = {
  minLength: MIN_PASSWORD_LENGTH,
  maxLength: MAX_PASSWORD_LENGTH,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: true,
  forbiddenPatterns: [
    /password/i,
    /123456/i,
    /qwerty/i,
    /admin/i,
    /user/i,
    /test/i,
  ],
};

// Password validation result interface
export interface PasswordValidationResult {
  isValid: boolean;
  errors: string[];
  score: number; // 0-100 password strength score
}

// Password security utilities
export class PasswordSecurity {
  // Hash a password
  static async hashPassword(password: string): Promise<string> {
    try {
      const salt = await bcrypt.genSalt(SALT_ROUNDS);
      const hashedPassword = await bcrypt.hash(password, salt);

      logger.debug('Password hashed successfully');
      return hashedPassword;
    } catch (error) {
      logger.error('Password hashing failed:', error);
      throw new Error('Password hashing failed');
    }
  }

  // Verify a password against its hash
  static async verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
    try {
      const isValid = await bcrypt.compare(password, hashedPassword);

      if (isValid) {
        logger.debug('Password verification successful');
      } else {
        logger.warn('Password verification failed');
      }

      return isValid;
    } catch (error) {
      logger.error('Password verification error:', error);
      return false;
    }
  }

  // Validate password strength and requirements
  static validatePassword(password: string): PasswordValidationResult {
    const errors: string[] = [];
    let score = 0;

    // Check minimum length
    if (password.length < PASSWORD_REQUIREMENTS.minLength) {
      errors.push(`Password must be at least ${PASSWORD_REQUIREMENTS.minLength} characters long`);
    } else {
      score += 20;
    }

    // Check maximum length
    if (password.length > PASSWORD_REQUIREMENTS.maxLength) {
      errors.push(`Password must be no more than ${PASSWORD_REQUIREMENTS.maxLength} characters long`);
    }

    // Check for uppercase letters
    if (PASSWORD_REQUIREMENTS.requireUppercase && !/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    } else if (/[A-Z]/.test(password)) {
      score += 15;
    }

    // Check for lowercase letters
    if (PASSWORD_REQUIREMENTS.requireLowercase && !/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    } else if (/[a-z]/.test(password)) {
      score += 15;
    }

    // Check for numbers
    if (PASSWORD_REQUIREMENTS.requireNumbers && !/\d/.test(password)) {
      errors.push('Password must contain at least one number');
    } else if (/\d/.test(password)) {
      score += 15;
    }

    // Check for special characters
    if (PASSWORD_REQUIREMENTS.requireSpecialChars && !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      errors.push('Password must contain at least one special character');
    } else if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      score += 15;
    }

    // Check for forbidden patterns
    for (const pattern of PASSWORD_REQUIREMENTS.forbiddenPatterns) {
      if (pattern.test(password)) {
        errors.push('Password contains forbidden patterns');
        score -= 20;
        break;
      }
    }

    // Additional scoring based on length
    if (password.length >= 12) score += 10;
    if (password.length >= 16) score += 10;

    // Check for common patterns
    if (this.hasCommonPatterns(password)) {
      errors.push('Password contains common patterns that are easy to guess');
      score -= 10;
    }

    // Ensure score is between 0 and 100
    score = Math.max(0, Math.min(100, score));

    return {
      isValid: errors.length === 0,
      errors,
      score,
    };
  }

  // Check for common password patterns
  private static hasCommonPatterns(password: string): boolean {
    const commonPatterns = [
      /(.)\1{2,}/, // Repeated characters (aaa, 111, etc.)
      /123|234|345|456|567|678|789|890/, // Sequential numbers
      /abc|bcd|cde|def|efg|fgh|ghi|hij|ijk|jkl|klm|lmn|mno|nop|opq|pqr|qrs|rst|stu|tuv|uvw|vwx|wxy|xyz/, // Sequential letters
      /qwerty|asdfgh|zxcvbn/, // Keyboard patterns
    ];

    return commonPatterns.some(pattern => pattern.test(password.toLowerCase()));
  }

  // Generate a secure random password
  static generateSecurePassword(length: number = 16): string {
    const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=[]{}|;:,.<>?';
    let password = '';

    // Ensure at least one character from each required category
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const numbers = '0123456789';
    const special = '!@#$%^&*()_+-=[]{}|;:,.<>?';

    password += uppercase[Math.floor(Math.random() * uppercase.length)];
    password += lowercase[Math.floor(Math.random() * lowercase.length)];
    password += numbers[Math.floor(Math.random() * numbers.length)];
    password += special[Math.floor(Math.random() * special.length)];

    // Fill the rest with random characters
    for (let i = 4; i < length; i++) {
      password += charset[Math.floor(Math.random() * charset.length)];
    }

    // Shuffle the password
    return password.split('').sort(() => Math.random() - 0.5).join('');
  }

  // Generate a secure random token
  static generateSecureToken(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }

  // Generate a secure random string
  static generateSecureString(length: number = 16): string {
    const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';

    for (let i = 0; i < length; i++) {
      result += charset[Math.floor(Math.random() * charset.length)];
    }

    return result;
  }

  // Check if password has been compromised (basic check)
  static isPasswordCompromised(password: string): boolean {
    // This is a simplified check. In production, you'd want to integrate
    // with services like HaveIBeenPwned API
    const commonPasswords = [
      'password', '123456', '123456789', 'qwerty', 'abc123',
      'password123', 'admin', 'letmein', 'welcome', 'monkey',
      '1234567890', 'password1', 'qwerty123', 'dragon', 'master',
    ];

    return commonPasswords.includes(password.toLowerCase());
  }

  // Get password strength description
  static getPasswordStrengthDescription(score: number): string {
    if (score >= 80) return 'Very Strong';
    if (score >= 60) return 'Strong';
    if (score >= 40) return 'Medium';
    if (score >= 20) return 'Weak';
    return 'Very Weak';
  }

  // Sanitize password input
  static sanitizePassword(password: string): string {
    // Remove any potential XSS or injection attempts
    return password
      .replace(/[<>\"'&]/g, '') // Remove potentially dangerous characters
      .trim()
      .substring(0, MAX_PASSWORD_LENGTH); // Limit length
  }

  // Check password age (if you store creation date)
  static isPasswordExpired(createdAt: Date, maxAgeDays: number = 90): boolean {
    const now = new Date();
    const ageInDays = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24);
    return ageInDays > maxAgeDays;
  }

  // Validate password change requirements
  static validatePasswordChange(
    oldPassword: string,
    newPassword: string,
    hashedOldPassword: string,
  ): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check if old password is correct
    if (!bcrypt.compareSync(oldPassword, hashedOldPassword)) {
      errors.push('Current password is incorrect');
    }

    // Check if new password is different from old password
    if (oldPassword === newPassword) {
      errors.push('New password must be different from current password');
    }

    // Validate new password strength
    const validation = this.validatePassword(newPassword);
    if (!validation.isValid) {
      errors.push(...validation.errors);
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}

export default PasswordSecurity;
