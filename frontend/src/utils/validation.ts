// Validation utilities for forms and data

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export const validateEmail = (email: string): ValidationResult => {
  const errors: string[] = [];
  
  if (!email) {
    errors.push('Email is required');
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.push('Please enter a valid email address');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
};

export const validatePassword = (password: string): ValidationResult => {
  const errors: string[] = [];
  
  if (!password) {
    errors.push('Password is required');
  } else {
    if (password.length < 8) {
      errors.push('Password must be at least 8 characters long');
    }
    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }
    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }
    if (!/\d/.test(password)) {
      errors.push('Password must contain at least one number');
    }
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
};

export const validateUsername = (username: string): ValidationResult => {
  const errors: string[] = [];
  
  if (!username) {
    errors.push('Username is required');
  } else {
    if (username.length < 3) {
      errors.push('Username must be at least 3 characters long');
    }
    if (username.length > 20) {
      errors.push('Username must be less than 20 characters');
    }
    if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
      errors.push('Username can only contain letters, numbers, underscores, and hyphens');
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
};

export const validateServerName = (name: string): ValidationResult => {
  const errors: string[] = [];
  
  if (!name) {
    errors.push('Server name is required');
  } else {
    if (name.length < 3) {
      errors.push('Server name must be at least 3 characters long');
    }
    if (name.length > 50) {
      errors.push('Server name must be less than 50 characters');
    }
    if (!/^[a-zA-Z0-9\s_-]+$/.test(name)) {
      errors.push('Server name can only contain letters, numbers, spaces, underscores, and hyphens');
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
};

export const validatePort = (port: string | number): ValidationResult => {
  const errors: string[] = [];
  const portNum = typeof port === 'string' ? parseInt(port, 10) : port;
  
  if (!port) {
    errors.push('Port is required');
  } else if (isNaN(portNum)) {
    errors.push('Port must be a valid number');
  } else if (portNum < 1024 || portNum > 65535) {
    errors.push('Port must be between 1024 and 65535');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
};

export const validateMemory = (memory: string | number): ValidationResult => {
  const errors: string[] = [];
  const memoryNum = typeof memory === 'string' ? parseInt(memory, 10) : memory;
  
  if (!memory) {
    errors.push('Memory is required');
  } else if (isNaN(memoryNum)) {
    errors.push('Memory must be a valid number');
  } else if (memoryNum < 512) {
    errors.push('Memory must be at least 512 MB');
  } else if (memoryNum > 8192) {
    errors.push('Memory must be less than 8192 MB');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
};

export const validateMOTD = (motd: string): ValidationResult => {
  const errors: string[] = [];
  
  if (motd && motd.length > 100) {
    errors.push('MOTD must be less than 100 characters');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
};

// Form validation helpers
export const validateForm = (data: Record<string, any>, rules: Record<string, (value: any) => ValidationResult>): ValidationResult => {
  const allErrors: string[] = [];
  let isValid = true;
  
  for (const [field, validator] of Object.entries(rules)) {
    const result = validator(data[field]);
    if (!result.isValid) {
      isValid = false;
      allErrors.push(...result.errors);
    }
  }
  
  return {
    isValid,
    errors: allErrors,
  };
};

// Common validation rules
export const commonRules = {
  email: validateEmail,
  password: validatePassword,
  username: validateUsername,
  serverName: validateServerName,
  port: validatePort,
  memory: validateMemory,
  motd: validateMOTD,
};
