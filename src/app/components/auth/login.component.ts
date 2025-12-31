import { Component, output, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { AuthService } from '../../services/auth.service';
import { ModalComponent } from '../ui/modal/modal.component';
import { ButtonComponent } from '../ui/button/button.component';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule, ModalComponent, ButtonComponent],
  template: `
    <app-modal [title]="'Sign In'" (close)="close.emit()">
      <!-- Form -->
      <form id="login-form" (ngSubmit)="onSubmit()" class="space-y-4">
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
      </form>

      <!-- Footer: Buttons -->
      <ng-container footer>
        <app-button variant="secondary" (click)="close.emit()" [disabled]="isLoading()">
          Cancel
        </app-button>
        <app-button
          variant="primary"
          type="submit"
          (click)="onSubmit()"
          [disabled]="!canSubmit()"
        >
          @if (isLoading()) {
            <lucide-icon name="loader-circle" [size]="16" class="animate-spin mr-2"></lucide-icon>
            <span>Signing in...</span>
          } @else {
            <lucide-icon name="log-in" [size]="16" class="mr-2"></lucide-icon>
            <span>Sign In</span>
          }
        </app-button>
      </ng-container>

      <!-- Sub-footer: Link to Register -->
      <div sub-footer class="mt-2 text-slate-600">
          Don't have an account?
          <button
            (click)="switchToRegister.emit()"
            class="text-blue-600 hover:text-blue-700 font-semibold ml-1 underline decoration-blue-600/30 hover:decoration-blue-700 focus:outline-none"
            type="button"
          >
            Sign up
          </button>
      </div>
    </app-modal>
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
}
