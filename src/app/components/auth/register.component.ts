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
    <div class="fixed inset-0 bg-gradient-to-br from-black/60 via-purple-900/40 to-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" (click)="onBackdropClick($event)">
      <div class="backdrop-blur-xl bg-white/20 border border-white/30 rounded-2xl shadow-2xl max-w-md w-full p-6 md:p-8" (click)="$event.stopPropagation()">
        <!-- Header -->
        <div class="flex items-center justify-between mb-6">
          <h2 class="text-3xl font-bold text-white drop-shadow-lg">Create Account</h2>
          <button
            (click)="close.emit()"
            class="text-white/70 hover:text-white transition p-1 hover:bg-white/10 rounded-lg"
            type="button"
          >
            <lucide-icon name="x" [size]="24"></lucide-icon>
          </button>
        </div>

        <!-- Form -->
        <form (ngSubmit)="onSubmit()" class="space-y-4">
          <!-- Name (Optional) -->
          <div>
            <label for="name" class="block text-sm font-medium text-white mb-2">
              First Name <span class="text-white/60 font-normal">(Optional)</span>
            </label>
            <input
              type="text"
              id="name"
              [ngModel]="name()"
              (ngModelChange)="name.set($event)"
              name="name"
              class="w-full px-4 py-3 backdrop-blur-xl bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition"
              placeholder="John"
              [disabled]="isLoading()"
            />
          </div>

          <!-- Last Name (Optional) -->
          <div>
            <label for="lastName" class="block text-sm font-medium text-white mb-2">
              Last Name <span class="text-white/60 font-normal">(Optional)</span>
            </label>
            <input
              type="text"
              id="lastName"
              [ngModel]="lastName()"
              (ngModelChange)="lastName.set($event)"
              name="lastName"
              class="w-full px-4 py-3 backdrop-blur-xl bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition"
              placeholder="Doe"
              [disabled]="isLoading()"
            />
          </div>

          <!-- Email -->
          <div>
            <label for="email" class="block text-sm font-medium text-white mb-2">
              Email *
            </label>
            <input
              type="email"
              id="email"
              [ngModel]="email()"
              (ngModelChange)="email.set($event)"
              name="email"
              required
              class="w-full px-4 py-3 backdrop-blur-xl bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition"
              placeholder="you@example.com"
              [disabled]="isLoading()"
            />
          </div>

          <!-- Password -->
          <div>
            <label for="password" class="block text-sm font-medium text-white mb-2">
              Password *
            </label>
            <input
              type="password"
              id="password"
              [ngModel]="password()"
              (ngModelChange)="password.set($event)"
              name="password"
              required
              class="w-full px-4 py-3 backdrop-blur-xl bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition"
              placeholder="Min 8 chars, with number & symbol"
              [disabled]="isLoading()"
            />
            <!-- Password requirements -->
            <p class="mt-2 text-xs text-white/70">
              Must be at least 8 characters with a number and symbol
            </p>
          </div>

          <!-- Confirm Password -->
          <div>
            <label for="confirmPassword" class="block text-sm font-medium text-white mb-2">
              Confirm Password *
            </label>
            <input
              type="password"
              id="confirmPassword"
              [ngModel]="confirmPassword()"
              (ngModelChange)="confirmPassword.set($event)"
              name="confirmPassword"
              required
              class="w-full px-4 py-3 backdrop-blur-xl bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition"
              [class.border-red-400]="confirmPassword() && password() !== confirmPassword()"
              placeholder="••••••••"
              [disabled]="isLoading()"
            />
            @if (confirmPassword() && password() !== confirmPassword()) {
              <p class="mt-2 text-xs text-red-300">Passwords don't match</p>
            }
          </div>

          <!-- Error Message -->
          @if (errorMessage()) {
            <div class="backdrop-blur-xl bg-red-500/20 border border-red-400/30 text-red-100 px-4 py-3 rounded-xl flex items-start gap-2">
              <lucide-icon name="circle-alert" [size]="20" class="flex-shrink-0 mt-0.5"></lucide-icon>
              <p class="text-sm">{{ errorMessage() }}</p>
            </div>
          }

          <!-- Actions -->
          <div class="flex gap-3 pt-4">
            <button
              type="button"
              (click)="close.emit()"
              class="flex-1 px-5 py-3 backdrop-blur-xl bg-white/10 border border-white/20 text-white rounded-xl hover:bg-white/20 transition disabled:opacity-50 font-medium"
              [disabled]="isLoading()"
            >
              Cancel
            </button>
            <button
              type="submit"
              class="flex-1 px-5 py-3 backdrop-blur-xl bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition disabled:opacity-50 flex items-center justify-center gap-2 font-medium shadow-lg"
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
        <div class="mt-6 text-center text-sm text-white/80">
          Already have an account?
          <button
            (click)="switchToLogin.emit()"
            class="text-indigo-300 hover:text-indigo-200 font-semibold ml-1 underline decoration-indigo-300/50 hover:decoration-indigo-200"
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

  // Form fields as signals
  name = signal('');
  lastName = signal('');
  email = signal('');
  password = signal('');
  confirmPassword = signal('');

  // State
  errorMessage = signal<string>('');
  isLoading = this.authService.isLoading;

  // Computed
  canSubmit = computed(() => {
    return (
      !this.isLoading() &&
      this.email().trim() !== '' &&
      this.password().trim() !== '' &&
      this.confirmPassword().trim() !== '' &&
      this.password() === this.confirmPassword() &&
      this.password().length >= 8
    );
  });

  async onSubmit() {
    if (!this.canSubmit()) return;

    this.errorMessage.set('');

    try {
      await this.authService.register({
        email: this.email(),
        password: this.password(),
        name: this.name() || undefined,
        lastName: this.lastName() || undefined,
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
