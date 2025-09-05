import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Alert, AlertDescription } from '../ui/alert';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../ui/dialog';
import { 
  Users, 
  Plus, 
  Edit, 
  Trash2, 
  Crown, 
  Shield, 
  AlertTriangle, 
  CheckCircle, 
  Loader2,
  Search,
  Filter,
  UserPlus,
  UserMinus
} from 'lucide-react';
import { useUsers, useCreateUser, useUpdateUser, useDeleteUser } from '../../hooks/useAdmin';
import { useAuth } from '../../contexts/AuthContext';
import type { User, UserCreateRequest, UserUpdateRequest } from '../../types/api';

interface UserManagementPanelProps {
  onUserUpdate?: () => void;
}

const UserManagementPanel: React.FC<UserManagementPanelProps> = ({
  onUserUpdate
}) => {
  const { user: currentUser } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [formData, setFormData] = useState<UserCreateRequest>({
    username: '',
    password: '',
    is_admin: false
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { data: users, isLoading } = useUsers();
  const createUserMutation = useCreateUser();
  const updateUserMutation = useUpdateUser();
  const deleteUserMutation = useDeleteUser();

  const filteredUsers = users?.filter(user =>
    user.username.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.username.trim()) {
      newErrors.username = 'Username is required';
    } else if (formData.username.trim().length < 3) {
      newErrors.username = 'Username must be at least 3 characters long';
    } else if (!/^[a-zA-Z0-9_]+$/.test(formData.username.trim())) {
      newErrors.username = 'Username can only contain letters, numbers, and underscores';
    }

    if (!formData.password && !selectedUser) {
      newErrors.password = 'Password is required';
    } else if (formData.password && formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters long';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field: keyof UserCreateRequest, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const handleCreateUser = async () => {
    if (!validateForm()) return;

    try {
      await createUserMutation.mutateAsync(formData);
      setFormData({ username: '', password: '', is_admin: false });
      setShowCreateDialog(false);
      setErrors({});
      onUserUpdate?.();
    } catch (error) {
      console.error('Failed to create user:', error);
    }
  };

  const handleEditUser = async () => {
    if (!selectedUser || !validateForm()) return;

    try {
      const updateData: UserUpdateRequest = {
        username: formData.username,
        is_admin: formData.is_admin
      };

      if (formData.password) {
        updateData.password = formData.password;
      }

      await updateUserMutation.mutateAsync({
        id: selectedUser.id,
        data: updateData
      });
      
      setShowEditDialog(false);
      setSelectedUser(null);
      setFormData({ username: '', password: '', is_admin: false });
      setErrors({});
      onUserUpdate?.();
    } catch (error) {
      console.error('Failed to update user:', error);
    }
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;

    try {
      await deleteUserMutation.mutateAsync(selectedUser.id);
      setShowDeleteDialog(false);
      setSelectedUser(null);
      onUserUpdate?.();
    } catch (error) {
      console.error('Failed to delete user:', error);
    }
  };

  const openEditDialog = (user: User) => {
    setSelectedUser(user);
    setFormData({
      username: user.username,
      password: '',
      is_admin: user.is_admin
    });
    setErrors({});
    setShowEditDialog(true);
  };

  const openDeleteDialog = (user: User) => {
    setSelectedUser(user);
    setShowDeleteDialog(true);
  };

  const resetForm = () => {
    setFormData({ username: '', password: '', is_admin: false });
    setErrors({});
    setSelectedUser(null);
  };

  const isLoadingAny = createUserMutation.isPending || updateUserMutation.isPending || deleteUserMutation.isPending;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Users className="h-5 w-5" />
          <span>User Management</span>
        </CardTitle>
        <CardDescription>
          Manage user accounts, permissions, and access control
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Search and Actions */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button 
                className="bg-minecraft-green hover:bg-minecraft-dark-green"
                onClick={resetForm}
              >
                <UserPlus className="h-4 w-4 mr-2" />
                Add User
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New User</DialogTitle>
                <DialogDescription>
                  Create a new user account with custom permissions
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    placeholder="Enter username"
                    value={formData.username}
                    onChange={(e) => handleInputChange('username', e.target.value)}
                    className={errors.username ? 'border-destructive' : ''}
                  />
                  {errors.username && (
                    <p className="text-sm text-destructive">{errors.username}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter password"
                    value={formData.password}
                    onChange={(e) => handleInputChange('password', e.target.value)}
                    className={errors.password ? 'border-destructive' : ''}
                  />
                  {errors.password && (
                    <p className="text-sm text-destructive">{errors.password}</p>
                  )}
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="is_admin"
                    checked={formData.is_admin}
                    onChange={(e) => handleInputChange('is_admin', e.target.checked)}
                    className="rounded border-gray-300"
                  />
                  <Label htmlFor="is_admin" className="flex items-center space-x-2">
                    <Crown className="h-4 w-4 text-yellow-500" />
                    <span>Admin privileges</span>
                  </Label>
                </div>
              </div>
              
              <DialogFooter>
                <Button 
                  variant="outline" 
                  onClick={() => setShowCreateDialog(false)}
                  disabled={isLoadingAny}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleCreateUser}
                  disabled={isLoadingAny}
                  className="bg-minecraft-green hover:bg-minecraft-dark-green"
                >
                  {createUserMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    'Create User'
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Users List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin mr-2" />
            <span>Loading users...</span>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="text-center py-8">
            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              {searchTerm ? 'No users found matching your search' : 'No users found'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredUsers.map((user) => (
              <div key={user.id} className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="h-10 w-10 bg-minecraft-green rounded-full flex items-center justify-center">
                    <Users className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <p className="font-medium">{user.username}</p>
                      {user.is_admin && (
                        <Crown className="h-4 w-4 text-yellow-500" />
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {user.server_count || 0} servers • {user.total_memory_allocated || 0} MB allocated
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Created: {new Date(user.created_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  {user.is_admin && (
                    <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full">
                      Admin
                    </span>
                  )}
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openEditDialog(user)}
                    disabled={isLoadingAny}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  
                  {user.id !== currentUser?.id && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openDeleteDialog(user)}
                      disabled={isLoadingAny}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Edit User Dialog */}
        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit User</DialogTitle>
              <DialogDescription>
                Update user information and permissions
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-username">Username</Label>
                <Input
                  id="edit-username"
                  value={formData.username}
                  onChange={(e) => handleInputChange('username', e.target.value)}
                  className={errors.username ? 'border-destructive' : ''}
                />
                {errors.username && (
                  <p className="text-sm text-destructive">{errors.username}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-password">New Password (optional)</Label>
                <Input
                  id="edit-password"
                  type="password"
                  placeholder="Leave empty to keep current password"
                  value={formData.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  className={errors.password ? 'border-destructive' : ''}
                />
                {errors.password && (
                  <p className="text-sm text-destructive">{errors.password}</p>
                )}
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="edit-is_admin"
                  checked={formData.is_admin}
                  onChange={(e) => handleInputChange('is_admin', e.target.checked)}
                  className="rounded border-gray-300"
                />
                <Label htmlFor="edit-is_admin" className="flex items-center space-x-2">
                  <Crown className="h-4 w-4 text-yellow-500" />
                  <span>Admin privileges</span>
                </Label>
              </div>
            </div>
            
            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => setShowEditDialog(false)}
                disabled={isLoadingAny}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleEditUser}
                disabled={isLoadingAny}
                className="bg-minecraft-green hover:bg-minecraft-dark-green"
              >
                {updateUserMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Updating...
                  </>
                ) : (
                  'Update User'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete User Dialog */}
        <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center space-x-2">
                <AlertTriangle className="h-5 w-5 text-red-500" />
                <span>Delete User</span>
              </DialogTitle>
              <DialogDescription>
                Are you sure you want to delete "{selectedUser?.username}"? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Warning:</strong> This will permanently delete the user account and all associated servers.
                All server data will be lost.
              </AlertDescription>
            </Alert>
            
            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => setShowDeleteDialog(false)}
                disabled={isLoadingAny}
              >
                Cancel
              </Button>
              <Button 
                variant="destructive"
                onClick={handleDeleteUser}
                disabled={isLoadingAny}
              >
                {deleteUserMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete User
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};

export default UserManagementPanel;
