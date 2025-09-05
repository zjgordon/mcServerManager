import React, { useState } from 'react';
import { apiService } from '../../services/api';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Label } from '../ui/label';
import { Alert, AlertDescription } from '../ui/alert';
import { Loader2, Eye, EyeOff, CheckCircle } from 'lucide-react';
import type { SetupRequest } from '../../types/api';

interface SetupFormProps {
  onSuccess?: (user: any) => void;
  onError?: (error: string) => void;
}

interface FormData extends SetupRequest {
  confirmPassword: string;
}

interface FormErrors {
  username?: string;
  password?: string;
  confirmPassword?: string;
  email?: string;
  general?: string;
}

const SetupForm: React.FC<SetupFormProps> = ({ onSuccess, onError }) => {
  const [formData, setFormData] = useState<FormData>({
    username: '',
    password: '',
    confirm_password: '',
    confirmPassword: '',
    email: '',
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    // Username validation
    if (!formData.username.trim()) {
      newErrors.username = 'Username is required';
    } else if (formData.username.trim().length < 3) {
      newErrors.username = 'Username must be at least 3 characters long';
    } else if (!/^[a-zA-Z0-9_-]+$/.test(formData.username.trim())) {
      newErrors.username = 'Username can only contain letters, numbers, underscores, and hyphens';
    }

    // Password validation
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters long';
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) {
      newErrors.password = 'Password must contain at least one uppercase letter, one lowercase letter, and one number';
    }

    // Confirm password validation
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    // Email validation (optional)
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear field-specific error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    setErrors({});

    try {
      const setupData: SetupRequest = {
        username: formData.username.trim(),
        password: formData.password,
        confirm_password: formData.confirmPassword,
        email: formData.email.trim() || undefined,
      };

      const response = await apiService.setupAdmin(setupData);
      
      if (response.success && response.data) {
        onSuccess?.(response.data);
      } else {
        const errorMessage = response.message || 'Setup failed. Please try again.';
        setErrors({ general: errorMessage });
        onError?.(errorMessage);
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Setup failed. Please try again.';
      setErrors({ general: errorMessage });
      onError?.(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold text-center">
          Setup Admin Account
        </CardTitle>
        <CardDescription className="text-center">
          Create your initial administrator account to get started
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {errors.general && (
            <Alert variant="destructive">
              <AlertDescription>{errors.general}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              type="text"
              placeholder="Enter admin username"
              value={formData.username}
              onChange={(e) => handleInputChange('username', e.target.value)}
              disabled={isLoading}
              className={errors.username ? 'border-destructive' : ''}
              autoComplete="username"
            />
            {errors.username && (
              <p className="text-sm text-destructive">{errors.username}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email (Optional)</Label>
            <Input
              id="email"
              type="email"
              placeholder="Enter email address"
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              disabled={isLoading}
              className={errors.email ? 'border-destructive' : ''}
              autoComplete="email"
            />
            {errors.email && (
              <p className="text-sm text-destructive">{errors.email}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter secure password"
                value={formData.password}
                onChange={(e) => handleInputChange('password', e.target.value)}
                disabled={isLoading}
                className={errors.password ? 'border-destructive pr-10' : 'pr-10'}
                autoComplete="new-password"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setShowPassword(!showPassword)}
                disabled={isLoading}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <Eye className="h-4 w-4 text-muted-foreground" />
                )}
              </Button>
            </div>
            {errors.password && (
              <p className="text-sm text-destructive">{errors.password}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm Password</Label>
            <div className="relative">
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                placeholder="Confirm your password"
                value={formData.confirmPassword}
                onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                disabled={isLoading}
                className={errors.confirmPassword ? 'border-destructive pr-10' : 'pr-10'}
                autoComplete="new-password"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                disabled={isLoading}
              >
                {showConfirmPassword ? (
                  <EyeOff className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <Eye className="h-4 w-4 text-muted-foreground" />
                )}
              </Button>
            </div>
            {errors.confirmPassword && (
              <p className="text-sm text-destructive">{errors.confirmPassword}</p>
            )}
          </div>

          <div className="bg-muted/50 p-3 rounded-md">
            <p className="text-sm text-muted-foreground">
              <strong>Password requirements:</strong>
            </p>
            <ul className="text-sm text-muted-foreground mt-1 space-y-1">
              <li className="flex items-center gap-2">
                <CheckCircle className={`h-3 w-3 ${formData.password.length >= 8 ? 'text-green-500' : 'text-muted-foreground'}`} />
                At least 8 characters
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className={`h-3 w-3 ${/(?=.*[a-z])/.test(formData.password) ? 'text-green-500' : 'text-muted-foreground'}`} />
                One lowercase letter
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className={`h-3 w-3 ${/(?=.*[A-Z])/.test(formData.password) ? 'text-green-500' : 'text-muted-foreground'}`} />
                One uppercase letter
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className={`h-3 w-3 ${/(?=.*\d)/.test(formData.password) ? 'text-green-500' : 'text-muted-foreground'}`} />
                One number
              </li>
            </ul>
          </div>

          <Button
            type="submit"
            className="w-full"
            variant="minecraft"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating account...
              </>
            ) : (
              'Create Admin Account'
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default SetupForm;
