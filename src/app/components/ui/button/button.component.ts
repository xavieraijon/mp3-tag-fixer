import { Component, input, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';

export type ButtonPalette = 'primary' | 'neutral' | 'blue' | 'purple' | 'emerald' | 'red';
export type ButtonVariant = 'solid' | 'glass' | 'ghost' | 'outline';
export type ButtonShape = 'default' | 'pill' | 'circle' | 'square';
export type ButtonSize = 'sm' | 'md' | 'lg';

// Backward compatibility types
type LegacyVariant = 'primary' | 'secondary' | 'danger' | 'ghost';

// Styles Map with Dark Mode support
const BUTTON_STYLES: Record<ButtonVariant, Record<ButtonPalette, string>> = {
  solid: {
    primary:
      'bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 dark:from-indigo-600 dark:to-purple-600 dark:hover:from-indigo-500 dark:hover:to-purple-500 text-white shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 dark:shadow-indigo-900/50 border border-transparent hover:scale-[1.02] active:scale-[0.98]',
    neutral:
      'bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 text-white shadow-lg shadow-slate-500/20 dark:shadow-slate-900/50 border border-transparent hover:scale-[1.02] active:scale-[0.98]',
    blue: 'bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-500 text-white shadow-lg shadow-blue-500/25 dark:shadow-blue-900/50 border border-transparent hover:scale-[1.02] active:scale-[0.98]',
    purple:
      'bg-purple-500 hover:bg-purple-600 dark:bg-purple-600 dark:hover:bg-purple-500 text-white shadow-lg shadow-purple-500/25 dark:shadow-purple-900/50 border border-transparent hover:scale-[1.02] active:scale-[0.98]',
    emerald:
      'bg-emerald-500 hover:bg-emerald-600 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white shadow-lg shadow-emerald-500/25 dark:shadow-emerald-900/50 border border-transparent hover:scale-[1.02] active:scale-[0.98]',
    red: 'bg-gradient-to-r from-red-500 to-rose-500 hover:from-red-600 hover:to-rose-600 dark:from-red-600 dark:to-rose-600 dark:hover:from-red-500 dark:hover:to-rose-500 text-white shadow-lg shadow-red-500/25 dark:shadow-red-900/50 border border-transparent hover:scale-[1.02] active:scale-[0.98]',
  },
  glass: {
    primary:
      'backdrop-blur-xl bg-white/60 dark:bg-slate-800/60 hover:bg-indigo-50/80 dark:hover:bg-indigo-900/40 text-slate-700 dark:text-slate-200 hover:text-indigo-700 dark:hover:text-indigo-300 border border-slate-200/60 dark:border-slate-700/60 hover:border-indigo-300/60 dark:hover:border-indigo-500/50 shadow-sm hover:shadow-md transition-all duration-200',
    neutral:
      'backdrop-blur-xl bg-white/60 dark:bg-slate-800/60 hover:bg-slate-100/80 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-slate-100 border border-slate-200/60 dark:border-slate-700/60 hover:border-slate-300/60 dark:hover:border-slate-600/60 shadow-sm hover:shadow-md transition-all duration-200',
    blue: 'backdrop-blur-xl bg-blue-50/60 dark:bg-blue-900/30 hover:bg-blue-100/80 dark:hover:bg-blue-800/50 text-blue-700 dark:text-blue-300 hover:text-blue-800 dark:hover:text-blue-200 border border-blue-200/60 dark:border-blue-700/50 hover:border-blue-300/60 dark:hover:border-blue-600/60 shadow-sm hover:shadow-md transition-all duration-200',
    purple:
      'backdrop-blur-xl bg-purple-50/60 dark:bg-purple-900/30 hover:bg-purple-100/80 dark:hover:bg-purple-800/50 text-purple-700 dark:text-purple-300 hover:text-purple-800 dark:hover:text-purple-200 border border-purple-200/60 dark:border-purple-700/50 hover:border-purple-300/60 dark:hover:border-purple-600/60 shadow-sm hover:shadow-md transition-all duration-200',
    emerald:
      'backdrop-blur-xl bg-emerald-50/60 dark:bg-emerald-900/30 hover:bg-emerald-100/80 dark:hover:bg-emerald-800/50 text-emerald-700 dark:text-emerald-300 hover:text-emerald-800 dark:hover:text-emerald-200 border border-emerald-200/60 dark:border-emerald-700/50 hover:border-emerald-300/60 dark:hover:border-emerald-600/60 shadow-sm hover:shadow-md transition-all duration-200',
    red: 'backdrop-blur-xl bg-red-50/60 dark:bg-red-900/30 hover:bg-red-100/80 dark:hover:bg-red-800/50 text-red-700 dark:text-red-300 hover:text-red-800 dark:hover:text-red-200 border border-red-200/60 dark:border-red-700/50 hover:border-red-300/60 dark:hover:border-red-600/60 shadow-sm hover:shadow-md transition-all duration-200',
  },
  ghost: {
    primary:
      'text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-all duration-200',
    neutral:
      'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all duration-200',
    blue: 'text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-all duration-200',
    purple:
      'text-slate-600 dark:text-slate-400 hover:text-purple-600 dark:hover:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/30 transition-all duration-200',
    emerald:
      'text-slate-600 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 transition-all duration-200',
    red: 'text-slate-600 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 transition-all duration-200',
  },
  outline: {
    primary:
      'border-2 border-slate-200 dark:border-slate-700 hover:border-indigo-500 dark:hover:border-indigo-400 text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50/50 dark:hover:bg-indigo-900/20 transition-all duration-200',
    neutral:
      'border-2 border-slate-200 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-500 text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-all duration-200',
    blue: 'border-2 border-slate-200 dark:border-slate-700 hover:border-blue-500 dark:hover:border-blue-400 text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50/50 dark:hover:bg-blue-900/20 transition-all duration-200',
    purple:
      'border-2 border-slate-200 dark:border-slate-700 hover:border-purple-500 dark:hover:border-purple-400 text-slate-600 dark:text-slate-400 hover:text-purple-600 dark:hover:text-purple-400 hover:bg-purple-50/50 dark:hover:bg-purple-900/20 transition-all duration-200',
    emerald:
      'border-2 border-slate-200 dark:border-slate-700 hover:border-emerald-500 dark:hover:border-emerald-400 text-slate-600 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50/50 dark:hover:bg-emerald-900/20 transition-all duration-200',
    red: 'border-2 border-slate-200 dark:border-slate-700 hover:border-red-500 dark:hover:border-red-400 text-slate-600 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50/50 dark:hover:bg-red-900/20 transition-all duration-200',
  },
};

@Component({
  selector: 'app-button',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  template: `
    <button
      [type]="type()"
      [disabled]="disabled()"
      [attr.aria-disabled]="disabled()"
      [className]="computedClasses()"
      (click)="handleClick($event)"
      [title]="title()"
    >
      @if (icon()) {
        <lucide-icon
          [name]="icon()!"
          [size]="iconSize()"
          [class.mr-2]="!isIconOnly()"
          [class.mr-0]="isIconOnly()"
        ></lucide-icon>
      }
      <ng-content></ng-content>
    </button>
  `,
})
export class ButtonComponent {
  // New Inputs
  palette = input<ButtonPalette>('primary');
  variant = input<ButtonVariant | LegacyVariant>('solid');
  shape = input<ButtonShape>('default');

  // Existing Inputs
  size = input<ButtonSize>('md');
  fullWidth = input<boolean>(false);
  disabled = input<boolean>(false);
  type = input<'button' | 'submit' | 'reset'>('button');
  icon = input<string | undefined>(undefined);
  title = input<string | undefined>(undefined);

  isIconOnly = computed(() => this.shape() === 'circle' || this.shape() === 'square');

  computedClasses = computed(() => {
    const base =
      'inline-flex items-center justify-center font-semibold transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo-500 dark:focus-visible:ring-indigo-400 dark:focus-visible:ring-offset-slate-900';
    const rawVariant = this.variant();
    const defaultPalette = this.palette();

    let effectivePalette: ButtonPalette = defaultPalette;
    let effectiveVariant: ButtonVariant;

    if (rawVariant === 'primary') {
      effectivePalette = 'primary';
      effectiveVariant = 'solid';
    } else if (rawVariant === 'secondary') {
      effectivePalette = 'neutral';
      effectiveVariant = 'glass';
    } else if (rawVariant === 'danger') {
      effectivePalette = 'red';
      effectiveVariant = 'solid';
    } else if (rawVariant === 'ghost') {
      effectivePalette = 'neutral';
      effectiveVariant = 'ghost';
    } else {
      effectiveVariant = rawVariant as ButtonVariant;
    }

    const styleClass =
      BUTTON_STYLES[effectiveVariant]?.[effectivePalette] || BUTTON_STYLES['solid']['primary'];
    const sizeClass = this.getSizeClasses(this.shape(), this.size());
    const widthClass = this.fullWidth() ? 'w-full' : '';
    const disabledClass = this.disabled()
      ? 'opacity-50 cursor-not-allowed pointer-events-none'
      : '';

    return `${base} ${styleClass} ${sizeClass} ${widthClass} ${disabledClass}`;
  });

  private getSizeClasses(shape: ButtonShape, size: ButtonSize): string {
    const isPill = shape === 'default' || shape === 'pill';
    const rounded = shape === 'pill' || shape === 'circle' ? 'rounded-full' : 'rounded-xl';

    if (isPill) {
      switch (size) {
        case 'sm':
          return `px-3 py-1.5 text-xs ${rounded}`;
        case 'md':
          return `px-4 py-2 text-sm ${rounded}`;
        case 'lg':
          return `px-6 py-3 text-base ${rounded}`;
      }
    } else {
      switch (size) {
        case 'sm':
          return `p-1.5 ${rounded}`;
        case 'md':
          return `p-2 ${rounded}`;
        case 'lg':
          return `p-3 ${rounded}`;
      }
    }
    return '';
  }

  iconSize() {
    switch (this.size()) {
      case 'sm':
        return 14;
      case 'lg':
        return 20;
      default:
        return 16;
    }
  }

  handleClick(event: MouseEvent) {
    if (this.disabled()) {
      event.preventDefault();
      event.stopPropagation();
    }
  }
}
