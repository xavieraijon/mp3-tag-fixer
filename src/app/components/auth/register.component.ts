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
    <div class="fixed inset-0 bg-slate-900/30 backdrop-blur-sm flex items-center justify-center z-50 p-4" (click)="onBackdropClick($event)">
      <div class="backdrop-blur-xl bg-white/80 border border-white/50 rounded-3xl shadow-2xl max-w-md w-full overflow-hidden" (click)="$event.stopPropagation()">
        <!-- Header -->
        <div class="p-6 md:p-8 border-b border-white/30 bg-white/30 flex items-center justify-between">
          <h2 class="text-3xl font-bold text-slate-800">Create Account</h2>
          <button
            (click)="close.emit()"
            class="p-2 text-slate-400 hover:text-slate-600 hover:bg-white/50 rounded-xl transition-all"
            type="button"
          >
            <lucide-icon name="x" [size]="24"></lucide-icon>
          </button>
        </div>

        <!-- Form -->
        <form (ngSubmit)="onSubmit()" class="p-6 md:p-8 space-y-4">
          <!-- Name (Optional) -->
          <div class="space-y-2">
            <label for="name" class="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              First Name <span class="text-slate-400 font-normal normal-case">(Optional)</span>
            </label>
            <input
              type="text"
              id="name"
              [ngModel]="name()"
              (ngModelChange)="name.set($event)"
              name="name"
              class="w-full px-4 py-3 bg-white/50 border border-white/50 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white/70 focus:border-blue-400/50 focus:ring-2 focus:ring-blue-400/20 transition-all"
              placeholder="John"
              [disabled]="isLoading()"
            />
          </div>

          <!-- Last Name (Optional) -->
          <div class="space-y-2">
            <label for="lastName" class="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Last Name <span class="text-slate-400 font-normal normal-case">(Optional)</span>
            </label>
            <input
              type="text"
              id="lastName"
              [ngModel]="lastName()"
              (ngModelChange)="lastName.set($event)"
              name="lastName"
              class="w-full px-4 py-3 bg-white/50 border border-white/50 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white/70 focus:border-blue-400/50 focus:ring-2 focus:ring-blue-400/20 transition-all"
              placeholder="Doe"
              [disabled]="isLoading()"
            />
          </div>

          <!-- Email -->
          <div class="space-y-2">
            <label for="email" class="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Email *
            </label>
            <input
              type="email"
              id="email"
              [ngModel]="email()"
              (ngModelChange)="email.set($event)"
              name="email"
              required
              class="w-full px-4 py-3 bg-white/50 border border-white/50 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white/70 focus:border-blue-400/50 focus:ring-2 focus:ring-blue-400/20 transition-all"
              placeholder="you@example.com"
              [disabled]="isLoading()"
            />
          </div>

          <!-- Password -->
          <div class="space-y-2">
            <label for="password" class="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Password *
            </label>
            <input
              type="password"
              id="password"
              [ngModel]="password()"
              (ngModelChange)="password.set($event)"
              name="password"
              required
              class="w-full px-4 py-3 bg-white/50 border border-white/50 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white/70 focus:border-blue-400/50 focus:ring-2 focus:ring-blue-400/20 transition-all"
              placeholder="Min 8 chars, with number & symbol"
              [disabled]="isLoading()"
            />
            <!-- Password requirements -->
            <p class="mt-2 text-xs text-slate-500">
              Must be at least 8 characters with a number and symbol
            </p>
          </div>

          <!-- Confirm Password -->
          <div class="space-y-2">
            <label for="confirmPassword" class="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Confirm Password *
            </label>
            <input
              type="password"
              id="confirmPassword"
              [ngModel]="confirmPassword()"
              (ngModelChange)="confirmPassword.set($event)"
              name="confirmPassword"
              required
              class="w-full px-4 py-3 bg-white/50 border border-white/50 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white/70 focus:border-blue-400/50 focus:ring-2 focus:ring-blue-400/20 transition-all"
              [class.border-red-400]="confirmPassword() && password() !== confirmPassword()"
              placeholder="••••••••"
              [disabled]="isLoading()"
            />
            @if (confirmPassword() && password() !== confirmPassword()) {
              <p class="mt-2 text-xs text-red-600">Passwords don't match</p>
            }
          </div>

          <!-- Error Message -->
          @if (errorMessage()) {
            <div class="bg-red-50/80 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-start gap-2">
              <lucide-icon name="circle-alert" [size]="20" class="flex-shrink-0 mt-0.5 text-red-500"></lucide-icon>
              <p class="text-sm">{{ errorMessage() }}</p>
            </div>
          }

          <!-- Actions -->
          <div class="flex gap-3 pt-4">
            <button
              type="button"
              (click)="close.emit()"
              class="flex-1 px-5 py-3 text-slate-600 hover:text-slate-800 font-medium hover:bg-white/50 rounded-xl transition-all disabled:opacity-50"
              [disabled]="isLoading()"
            >
              Cancel
            </button>
            <button
              type="submit"
              class="flex-1 px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white font-bold rounded-xl shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
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
        <div class="px-6 md:px-8 pb-6 md:pb-8 text-center text-sm text-slate-600">
          Already have an account?
          <button
            (click)="switchToLogin.emit()"
            class="text-blue-600 hover:text-blue-700 font-semibold ml-1 underline decoration-blue-600/30 hover:decoration-blue-700"
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
