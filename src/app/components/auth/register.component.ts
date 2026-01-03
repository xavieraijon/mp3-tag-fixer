import { Component, output, signal, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { AuthService } from '../../services/auth.service';
import { ModalComponent } from '../ui/modal/modal.component';
import { ButtonComponent } from '../ui/button/button.component';

import { InputComponent } from '../ui/input/input.component';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    LucideAngularModule,
    ModalComponent,
    ButtonComponent,
    InputComponent,
  ],
  template: `
    <app-modal [title]="'Create Account'" (closeModal)="closeModal.emit()" footerAlign="center">
      <!-- Form -->
      <form id="register-form" (ngSubmit)="onSubmit()" class="space-y-4">
        <!-- Name & Last Name Row -->
        <div class="grid grid-cols-2 gap-4">
          <app-input
            label="First Name"
            hint="(Optional)"
            id="name"
            [(value)]="name"
            placeholder="John"
            [disabled]="isLoading()"
          ></app-input>

          <app-input
            label="Last Name"
            hint="(Optional)"
            id="lastName"
            [(value)]="lastName"
            placeholder="Doe"
            [disabled]="isLoading()"
          ></app-input>
        </div>

        <!-- Email -->
        <app-input
          label="Email"
          [required]="true"
          type="email"
          id="email"
          [(value)]="email"
          placeholder="you@example.com"
          [disabled]="isLoading()"
        ></app-input>

        <!-- Password -->
        <app-input
          label="Password"
          [required]="true"
          type="password"
          id="password"
          [(value)]="password"
          placeholder="••••••••"
          [disabled]="isLoading()"
        ></app-input>
        <!-- Password requirements -->
        <p class="mt-1 text-xs text-slate-500">
          Must be at least 8 characters with a number and symbol
        </p>

        <!-- Confirm Password -->
        <div class="space-y-1">
          <app-input
            label="Confirm Password"
            [required]="true"
            type="password"
            id="confirmPassword"
            [(value)]="confirmPassword"
            placeholder="••••••••"
            [disabled]="isLoading()"
          ></app-input>
          @if (confirmPassword() && password() !== confirmPassword()) {
            <p class="mt-1 text-xs text-red-600 ml-1">Passwords don't match</p>
          }
        </div>

        <!-- Error Message -->
        @if (errorMessage()) {
          <div
            class="bg-red-50/80 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-start gap-2"
          >
            <lucide-icon
              name="circle-alert"
              [size]="18"
              class="flex-shrink-0 mt-0.5 text-red-500"
            ></lucide-icon>
            <p class="text-sm">{{ errorMessage() }}</p>
          </div>
        }
      </form>

      <!-- Footer: Buttons -->
      <ng-container footer>
        <app-button variant="secondary" (click)="closeModal.emit()" [disabled]="isLoading()">
          Cancel
        </app-button>
        <app-button variant="primary" type="submit" (click)="onSubmit()" [disabled]="!canSubmit()">
          @if (isLoading()) {
            <lucide-icon name="loader-circle" [size]="16" class="animate-spin mr-2"></lucide-icon>
            <span>Creating...</span>
          } @else {
            <lucide-icon name="user-plus" [size]="16" class="mr-2"></lucide-icon>
            <span>Create Account</span>
          }
        </app-button>
      </ng-container>

      <!-- Sub-footer: Link to Login -->
      <div sub-footer class="mt-2 text-slate-600">
        Already have an account?
        <button
          (click)="switchToLogin.emit()"
          class="text-blue-600 hover:text-blue-700 font-semibold ml-1 underline decoration-blue-600/30 hover:decoration-blue-700 focus:outline-none"
          type="button"
        >
          Sign in
        </button>
      </div>
    </app-modal>
  `,
})
export class RegisterComponent {
  private readonly authService = inject(AuthService);

  // Outputs
  closeModal = output<void>();
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
      this.closeModal.emit();
    } catch (error: unknown) {
      console.error('[RegisterComponent] Registration failed:', error);
      const err = error as { error?: { message?: string }; message?: string };
      const message = err.error?.message || err.message || 'Registration failed. Please try again.';
      this.errorMessage.set(message);
    }
  }
}
