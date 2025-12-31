/**
 * User model - represents authenticated user
 */
export interface User {
  id: string;
  email: string;
  name?: string;
  lastName?: string;
  createdAt?: string;
  subscriptionStatus?: 'FREE' | 'ACTIVE' | 'CANCELED' | 'PAST_DUE';
}

/**
 * Login request payload
 */
export interface LoginRequest {
  email: string;
  password: string;
}

/**
 * Register request payload
 */
export interface RegisterRequest {
  email: string;
  password: string;
  name?: string;
  lastName?: string;
}

/**
 * Auth response from backend
 */
export interface AuthResponse {
  user: User;
  token: string;
}

/**
 * Auth state for the application
 */
export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}
