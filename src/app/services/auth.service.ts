import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { lastValueFrom } from 'rxjs';
import type { User, LoginRequest, RegisterRequest, AuthResponse } from '../models/auth.model';

const TOKEN_KEY = 'auth_token';
const API_URL = 'http://localhost:3000/api';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);

  // Private writable signals
  private _user = signal<User | null>(null);
  private _token = signal<string | null>(null);
  private _isLoading = signal(false);

  // Public readonly signals
  readonly user = this._user.asReadonly();
  readonly token = this._token.asReadonly();
  readonly isLoading = this._isLoading.asReadonly();

  // Computed signals
  readonly isAuthenticated = computed(() => !!this._token() && !!this._user());
  readonly userDisplayName = computed(() => {
    const user = this._user();
    if (!user) return null;
    if (user.name && user.lastName) return `${user.name} ${user.lastName}`;
    if (user.name) return user.name;
    return user.email;
  });

  constructor() {
    // Restore auth state from localStorage on init
    this.restoreAuthState();
  }

  /**
   * Register a new user
   */
  async register(data: RegisterRequest): Promise<void> {
    try {
      this._isLoading.set(true);
      const response = await lastValueFrom(
        this.http.post<AuthResponse>(`${API_URL}/auth/register`, data),
      );
      this.handleAuthSuccess(response);
    } catch (error) {
      console.error('[AuthService] Registration failed:', error);
      throw error;
    } finally {
      this._isLoading.set(false);
    }
  }

  /**
   * Login with email and password
   */
  async login(credentials: LoginRequest): Promise<void> {
    try {
      this._isLoading.set(true);
      const response = await lastValueFrom(
        this.http.post<AuthResponse>(`${API_URL}/auth/login`, credentials),
      );
      this.handleAuthSuccess(response);
    } catch (error) {
      console.error('[AuthService] Login failed:', error);
      throw error;
    } finally {
      this._isLoading.set(false);
    }
  }

  /**
   * Logout current user
   */
  async logout(): Promise<void> {
    try {
      const token = this._token();
      if (token) {
        // Call logout endpoint (optional, for session cleanup)
        await lastValueFrom(this.http.post(`${API_URL}/auth/logout`, {})).catch(() => {
          // Ignore errors on logout endpoint
          console.warn('[AuthService] Logout endpoint failed, but clearing local state');
        });
      }
    } finally {
      // Always clear local state
      this.clearAuthState();
      this.router.navigate(['/']);
    }
  }

  /**
   * Get current user from server
   */
  async getCurrentUser(): Promise<User | null> {
    try {
      const response = await lastValueFrom(this.http.get<{ user: User }>(`${API_URL}/auth/me`));
      this._user.set(response.user);
      return response.user;
    } catch (error) {
      console.error('[AuthService] Get current user failed:', error);
      this.clearAuthState();
      return null;
    }
  }

  /**
   * Handle successful authentication
   */
  private handleAuthSuccess(response: AuthResponse): void {
    this._user.set(response.user);
    this._token.set(response.token);
    localStorage.setItem(TOKEN_KEY, response.token);
    console.log('[AuthService] Authentication successful:', response.user.email);
  }

  /**
   * Clear authentication state
   */
  private clearAuthState(): void {
    this._user.set(null);
    this._token.set(null);
    localStorage.removeItem(TOKEN_KEY);
    console.log('[AuthService] Auth state cleared');
  }

  /**
   * Restore auth state from localStorage
   */
  private restoreAuthState(): void {
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) {
      this._token.set(token);
      // Fetch current user to validate token
      this.getCurrentUser().catch(() => {
        // Token is invalid, clear state
        this.clearAuthState();
      });
    }
  }

  /**
   * Get authorization header value
   */
  getAuthHeader(): string | null {
    const token = this._token();
    return token ? `Bearer ${token}` : null;
  }
}
