/**
 * 用户相关类型定义
 */

export interface CreateUserRequest {
  email: string;
  username: string;
  password: string;
  firstName?: string;
  lastName?: string;
  roleIds?: string[];
}

export interface UpdateUserRequest {
  firstName?: string;
  lastName?: string;
  avatar?: string;
  isActive?: boolean;
  roleIds?: string[];
}

export interface UserResponse {
  id: string;
  email: string;
  username: string;
  firstName?: string;
  lastName?: string;
  avatar?: string;
  isActive: boolean;
  isVerified: boolean;
  roles: string[];
  permissions: string[];
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserListQuery {
  page?: number;
  limit?: number;
  search?: string;
  role?: string;
  isActive?: boolean;
}

export interface UserListResponse {
  users: UserResponse[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}
