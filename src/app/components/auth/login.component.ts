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
    <div class="fixed inset-0 bg-gradient-to-br from-black/60 via-purple-900/40 to-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" (click)="onBackdropClick($event)">
      <div class="backdrop-blur-xl bg-white/20 border border-white/30 rounded-2xl shadow-2xl max-w-md w-full p-6 md:p-8" (click)="$event.stopPropagation()">
        <!-- Header -->
        <div class="flex items-center justify-between mb-6">
          <h2 class="text-3xl font-bold text-white drop-shadow-lg">Sign In</h2>
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
          <!-- Email -->
          <div>
            <label for="email" class="block text-sm font-medium text-white mb-2">
              Email
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
              Password
            </label>
            <input
              type="password"
              id="password"
              [ngModel]="password()"
              (ngModelChange)="password.set($event)"
              name="password"
              required
              class="w-full px-4 py-3 backdrop-blur-xl bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition"
              placeholder="••••••••"
              [disabled]="isLoading()"
            />
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
                <span>Signing in...</span>
              } @else {
                <lucide-icon name="log-in" [size]="20"></lucide-icon>
                <span>Sign In</span>
              }
            </button>
          </div>
        </form>

        <!-- Switch to Register -->
        <div class="mt-6 text-center text-sm text-white/80">
          Don't have an account?
          <button
            (click)="switchToRegister.emit()"
            class="text-indigo-300 hover:text-indigo-200 font-semibold ml-1 underline decoration-indigo-300/50 hover:decoration-indigo-200"
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
