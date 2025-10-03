export interface User {
  id: number;
  name: string;
  email: string;
  phone?: string;
  created_at?: string;
  updated_at?: string;
}

export interface UserProfile extends User {
  // UserProfile is now an alias for User with all fields
}

export interface UserCreateRequest {
  name: string;
  email: string;
  password: string;
}

export interface UserResponse {
  success: boolean;
  message?: string;
  user?: User;
}

export interface UserUpdateRequest {
  name?: string;
  phone?: string;
  email?: string;
}

export interface UserDeleteResponse {
  success: boolean;
  message?: string;
}
