import { Component, output, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  template: `
    <div class="fixed inset-0 bg-slate-900/30 backdrop-blur-sm flex items-center justify-center z-50 p-4" (click)="onBackdropClick($event)">
      <div class="backdrop-blur-xl bg-white/80 border border-white/50 rounded-3xl shadow-2xl max-w-md w-full overflow-hidden" (click)="$event.stopPropagation()">
        <!-- Header -->
        <div class="p-5 border-b border-white/30 bg-white/30 flex items-center justify-between">
          <h2 class="text-lg font-bold text-slate-800">Sign In</h2>
          <button
            (click)="close.emit()"
            class="p-2 text-slate-400 hover:text-slate-600 hover:bg-white/50 rounded-xl transition-all"
            type="button"
          >
            <lucide-icon name="x" [size]="20"></lucide-icon>
          </button>
        </div>

        <!-- Form -->
        <form (ngSubmit)="onSubmit()" class="p-5 space-y-4">
          <!-- Email -->
          <div class="space-y-1.5">
            <label for="email" class="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Email
            </label>
            <input
              type="email"
              id="email"
              [ngModel]="email()"
              (ngModelChange)="email.set($event)"
              name="email"
              required
              class="w-full px-4 py-2.5 bg-white/50 border border-white/50 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white/70 focus:border-blue-400/50 focus:ring-2 focus:ring-blue-400/20 transition-all"
              placeholder="you@example.com"
              [disabled]="isLoading()"
            />
          </div>

          <!-- Password -->
          <div class="space-y-1.5">
            <label for="password" class="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Password
            </label>
            <input
              type="password"
              id="password"
              [ngModel]="password()"
              (ngModelChange)="password.set($event)"
              name="password"
              required
              class="w-full px-4 py-2.5 bg-white/50 border border-white/50 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white/70 focus:border-blue-400/50 focus:ring-2 focus:ring-blue-400/20 transition-all"
              placeholder="••••••••"
              [disabled]="isLoading()"
            />
          </div>

          <!-- Error Message -->
          @if (errorMessage()) {
            <div class="bg-red-50/80 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-start gap-2">
              <lucide-icon name="circle-alert" [size]="18" class="flex-shrink-0 mt-0.5 text-red-500"></lucide-icon>
              <p class="text-sm">{{ errorMessage() }}</p>
            </div>
          }

          <!-- Actions -->
          <div class="flex gap-3 pt-2">
            <button
              type="button"
              (click)="close.emit()"
              class="flex-1 px-4 py-2.5 backdrop-blur-md bg-white/40 hover:bg-white/60 text-slate-600 hover:text-slate-700 rounded-xl border border-white/50 transition-all disabled:opacity-50 text-sm font-medium"
              [disabled]="isLoading()"
            >
              Cancel
            </button>
            <button
              type="submit"
              class="flex-1 px-4 py-2.5 backdrop-blur-md bg-gradient-to-r from-blue-500/80 to-indigo-500/80 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl border border-white/30 shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40 transition-all disabled:opacity-50 flex items-center justify-center gap-2 text-sm font-bold"
              [disabled]="!canSubmit()"
            >
              @if (isLoading()) {
                <lucide-icon name="loader-circle" [size]="16" class="animate-spin"></lucide-icon>
                <span>Signing in...</span>
              } @else {
                <lucide-icon name="log-in" [size]="16"></lucide-icon>
                <span>Sign In</span>
              }
            </button>
          </div>
        </form>

        <!-- Switch to Register -->
        <div class="px-5 pb-5 text-center text-sm text-slate-600">
          Don't have an account?
          <button
            (click)="switchToRegister.emit()"
            class="text-blue-600 hover:text-blue-700 font-semibold ml-1 underline decoration-blue-600/30 hover:decoration-blue-700"
            type="button"
          >
            Sign up
          </button>
        </div>
      </div>
    </div>
  `,
})
export class LoginComponent {
  private authService = inject(AuthService);

  // Outputs
  close = output<void>();
  switchToRegister = output<void>();

  // Form fields as signals
  email = signal('');
  password = signal('');

  // State
  errorMessage = signal<string>('');
  isLoading = this.authService.isLoading;

  // Computed
  canSubmit = computed(() => {
    return (
      !this.isLoading() &&
      this.email().trim() !== '' &&
      this.password().trim() !== ''
    );
  });

  async onSubmit() {
    if (!this.canSubmit()) return;

    this.errorMessage.set('');

    try {
      await this.authService.login({
        email: this.email(),
        password: this.password(),
      });
      this.close.emit();
    } catch (error: any) {
      console.error('[LoginComponent] Login failed:', error);
      const message = error.error?.message || error.message || 'Login failed. Please check your credentials.';
      this.errorMessage.set(message);
    }
  }

  onBackdropClick(event: MouseEvent) {
    if (event.target === event.currentTarget) {
      this.close.emit();
    }
  }
}
