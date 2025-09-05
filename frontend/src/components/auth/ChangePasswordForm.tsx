import React, { useState } from 'react';
import { apiService } from '../../services/api';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Label } from '../ui/label';
import { Alert, AlertDescription } from '../ui/alert';
import { Loader2, Eye, EyeOff, CheckCircle } from 'lucide-react';
import type { ChangePasswordRequest } from '../../types/api';

interface ChangePasswordFormProps {
  onSuccess?: () => void;
  onError?: (error: string) => void;
  onCancel?: () => void;
}

interface FormData extends ChangePasswordRequest {
  confirmNewPassword: string;
}

interface FormErrors {
  currentPassword?: string;
  newPassword?: string;
  confirmNewPassword?: string;
  general?: string;
}

const ChangePasswordForm: React.FC<ChangePasswordFormProps> = ({ 
  onSuccess, 
  onError, 
  onCancel 
}) => {
  const [formData, setFormData] = useState<FormData>({
    current_password: '',
    new_password: '',
    confirm_password: '',
    confirmNewPassword: '',
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [isLoading, setIsLoading] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    // Current password validation
    if (!formData.current_password) {
      newErrors.currentPassword = 'Current password is required';
    }

    // New password validation
    if (!formData.new_password) {
      newErrors.newPassword = 'New password is required';
    } else if (formData.new_password.length < 8) {
      newErrors.newPassword = 'Password must be at least 8 characters long';
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.new_password)) {
      newErrors.newPassword = 'Password must contain at least one uppercase letter, one lowercase letter, and one number';
    } else if (formData.current_password === formData.new_password) {
      newErrors.newPassword = 'New password must be different from current password';
    }

    // Confirm password validation
    if (!formData.confirmNewPassword) {
      newErrors.confirmNewPassword = 'Please confirm your new password';
    } else if (formData.new_password !== formData.confirmNewPassword) {
      newErrors.confirmNewPassword = 'Passwords do not match';
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
      const changePasswordData: ChangePasswordRequest = {
        current_password: formData.current_password,
        new_password: formData.new_password,
        confirm_password: formData.confirmNewPassword,
      };

      const response = await apiService.changePassword(changePasswordData);
      
      if (response.success) {
        // Clear form on success
        setFormData({
          current_password: '',
          new_password: '',
          confirm_password: '',
          confirmNewPassword: '',
        });
        onSuccess?.();
      } else {
        const errorMessage = response.message || 'Password change failed. Please try again.';
        setErrors({ general: errorMessage });
        onError?.(errorMessage);
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Password change failed. Please try again.';
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
          Change Password
        </CardTitle>
        <CardDescription className="text-center">
          Update your account password
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
            <Label htmlFor="currentPassword">Current Password</Label>
            <div className="relative">
              <Input
                id="currentPassword"
                type={showCurrentPassword ? 'text' : 'password'}
                placeholder="Enter current password"
                value={formData.current_password}
                onChange={(e) => handleInputChange('current_password', e.target.value)}
                disabled={isLoading}
                className={errors.currentPassword ? 'border-destructive pr-10' : 'pr-10'}
                autoComplete="current-password"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                disabled={isLoading}
              >
                {showCurrentPassword ? (
                  <EyeOff className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <Eye className="h-4 w-4 text-muted-foreground" />
                )}
              </Button>
            </div>
            {errors.currentPassword && (
              <p className="text-sm text-destructive">{errors.currentPassword}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="newPassword">New Password</Label>
            <div className="relative">
              <Input
                id="newPassword"
                type={showNewPassword ? 'text' : 'password'}
                placeholder="Enter new password"
                value={formData.new_password}
                onChange={(e) => handleInputChange('new_password', e.target.value)}
                disabled={isLoading}
                className={errors.newPassword ? 'border-destructive pr-10' : 'pr-10'}
                autoComplete="new-password"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setShowNewPassword(!showNewPassword)}
                disabled={isLoading}
              >
                {showNewPassword ? (
                  <EyeOff className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <Eye className="h-4 w-4 text-muted-foreground" />
                )}
              </Button>
            </div>
            {errors.newPassword && (
              <p className="text-sm text-destructive">{errors.newPassword}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmNewPassword">Confirm New Password</Label>
            <div className="relative">
              <Input
                id="confirmNewPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                placeholder="Confirm new password"
                value={formData.confirmNewPassword}
                onChange={(e) => handleInputChange('confirmNewPassword', e.target.value)}
                disabled={isLoading}
                className={errors.confirmNewPassword ? 'border-destructive pr-10' : 'pr-10'}
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
            {errors.confirmNewPassword && (
              <p className="text-sm text-destructive">{errors.confirmNewPassword}</p>
            )}
          </div>

          <div className="bg-muted/50 p-3 rounded-md">
            <p className="text-sm text-muted-foreground">
              <strong>Password requirements:</strong>
            </p>
            <ul className="text-sm text-muted-foreground mt-1 space-y-1">
              <li className="flex items-center gap-2">
                <CheckCircle className={`h-3 w-3 ${formData.new_password.length >= 8 ? 'text-green-500' : 'text-muted-foreground'}`} />
                At least 8 characters
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className={`h-3 w-3 ${/(?=.*[a-z])/.test(formData.new_password) ? 'text-green-500' : 'text-muted-foreground'}`} />
                One lowercase letter
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className={`h-3 w-3 ${/(?=.*[A-Z])/.test(formData.new_password) ? 'text-green-500' : 'text-muted-foreground'}`} />
                One uppercase letter
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className={`h-3 w-3 ${/(?=.*\d)/.test(formData.new_password) ? 'text-green-500' : 'text-muted-foreground'}`} />
                One number
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className={`h-3 w-3 ${formData.new_password && formData.current_password !== formData.new_password ? 'text-green-500' : 'text-muted-foreground'}`} />
                Different from current password
              </li>
            </ul>
          </div>

          <div className="flex gap-2">
            {onCancel && (
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={onCancel}
                disabled={isLoading}
              >
                Cancel
              </Button>
            )}
            <Button
              type="submit"
              className="flex-1"
              variant="minecraft"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                'Update Password'
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default ChangePasswordForm;
