export interface User {
  id: number;
  name: string;
  email: string;
  created_at?: string;
  updated_at?: string;
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
