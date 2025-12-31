import { Component, output, signal, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  template: `
    <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" (click)="onBackdropClick($event)">
      <div class="bg-white rounded-lg shadow-xl max-w-md w-full p-6" (click)="$event.stopPropagation()">
        <!-- Header -->
        <div class="flex items-center justify-between mb-6">
          <h2 class="text-2xl font-bold text-gray-900">Create Account</h2>
          <button
            (click)="close.emit()"
            class="text-gray-400 hover:text-gray-600 transition"
            type="button"
          >
            <lucide-icon name="x" [size]="24"></lucide-icon>
          </button>
        </div>

        <!-- Form -->
        <form (ngSubmit)="onSubmit()" class="space-y-4">
          <!-- Name (Optional) -->
          <div>
            <label for="name" class="block text-sm font-medium text-gray-700 mb-1">
              First Name <span class="text-gray-400 font-normal">(Optional)</span>
            </label>
            <input
              type="text"
              id="name"
              [(ngModel)]="name"
              name="name"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="John"
              [disabled]="isLoading()"
            />
          </div>

          <!-- Last Name (Optional) -->
          <div>
            <label for="lastName" class="block text-sm font-medium text-gray-700 mb-1">
              Last Name <span class="text-gray-400 font-normal">(Optional)</span>
            </label>
            <input
              type="text"
              id="lastName"
              [(ngModel)]="lastName"
              name="lastName"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Doe"
              [disabled]="isLoading()"
            />
          </div>

          <!-- Email -->
          <div>
            <label for="email" class="block text-sm font-medium text-gray-700 mb-1">
              Email *
            </label>
            <input
              type="email"
              id="email"
              [(ngModel)]="email"
              name="email"
              required
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="you@example.com"
              [disabled]="isLoading()"
            />
          </div>

          <!-- Password -->
          <div>
            <label for="password" class="block text-sm font-medium text-gray-700 mb-1">
              Password *
            </label>
            <input
              type="password"
              id="password"
              [(ngModel)]="password"
              name="password"
              required
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Min 8 chars, with number & symbol"
              [disabled]="isLoading()"
            />
            <!-- Password requirements -->
            <p class="mt-1 text-xs text-gray-500">
              Must be at least 8 characters with a number and symbol
            </p>
          </div>

          <!-- Confirm Password -->
          <div>
            <label for="confirmPassword" class="block text-sm font-medium text-gray-700 mb-1">
              Confirm Password *
            </label>
            <input
              type="password"
              id="confirmPassword"
              [(ngModel)]="confirmPassword"
              name="confirmPassword"
              required
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              [class.border-red-300]="confirmPassword && password !== confirmPassword"
              placeholder="••••••••"
              [disabled]="isLoading()"
            />
            @if (confirmPassword && password !== confirmPassword) {
              <p class="mt-1 text-xs text-red-600">Passwords don't match</p>
            }
          </div>

          <!-- Error Message -->
          @if (errorMessage()) {
            <div class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-start gap-2">
              <lucide-icon name="circle-alert" [size]="20" class="flex-shrink-0 mt-0.5"></lucide-icon>
              <p class="text-sm">{{ errorMessage() }}</p>
            </div>
          }

          <!-- Actions -->
          <div class="flex gap-3 pt-2">
            <button
              type="button"
              (click)="close.emit()"
              class="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition disabled:opacity-50"
              [disabled]="isLoading()"
            >
              Cancel
            </button>
            <button
              type="submit"
              class="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
              [disabled]="!canSubmit()"
            >
              @if (isLoading()) {
                <lucide-icon name="loader-circle" [size]="20" class="animate-spin"></lucide-icon>
                <span>Creating...</span>
              } @else {
                <lucide-icon name="user-plus" [size]="20"></lucide-icon>
                <span>Create Account</span>
              }
            </button>
          </div>
        </form>

        <!-- Switch to Login -->
        <div class="mt-6 text-center text-sm text-gray-600">
          Already have an account?
          <button
            (click)="switchToLogin.emit()"
            class="text-blue-600 hover:text-blue-700 font-medium"
            type="button"
          >
            Sign in
          </button>
        </div>
      </div>
    </div>
  `,
})
export class RegisterComponent {
  private authService = inject(AuthService);

  // Outputs
  close = output<void>();
  switchToLogin = output<void>();

  // Form fields
  name = '';
  lastName = '';
  email = '';
  password = '';
  confirmPassword = '';

  // State
  errorMessage = signal<string>('');
  isLoading = this.authService.isLoading;

  // Computed
  canSubmit = computed(() => {
    return (
      !this.isLoading() &&
      this.email &&
      this.password &&
      this.confirmPassword &&
      this.password === this.confirmPassword &&
      this.password.length >= 8
    );
  });

  async onSubmit() {
    if (!this.canSubmit()) return;

    this.errorMessage.set('');

    try {
      await this.authService.register({
        email: this.email,
        password: this.password,
        name: this.name || undefined,
        lastName: this.lastName || undefined,
      });
      this.close.emit();
    } catch (error: any) {
      console.error('[RegisterComponent] Registration failed:', error);
      const message = error.error?.message || error.message || 'Registration failed. Please try again.';
      this.errorMessage.set(message);
    }
  }

  onBackdropClick(event: MouseEvent) {
    if (event.target === event.currentTarget) {
      this.close.emit();
    }
  }
}
