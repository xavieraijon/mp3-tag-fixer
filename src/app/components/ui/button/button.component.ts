import { Component, input, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';

export type ButtonPalette = 'primary' | 'neutral' | 'blue' | 'purple' | 'emerald' | 'red';
export type ButtonVariant = 'solid' | 'glass' | 'ghost' | 'outline';
export type ButtonShape = 'default' | 'pill' | 'circle' | 'square';
export type ButtonSize = 'sm' | 'md' | 'lg';

// Backward compatibility types
type LegacyVariant = 'primary' | 'secondary' | 'danger' | 'ghost';

// Styles Map
const BUTTON_STYLES: Record<ButtonVariant, Record<ButtonPalette, string>> = {
  solid: {
    primary:
      'bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40 border border-transparent',
    neutral:
      'bg-slate-800 hover:bg-slate-900 text-white shadow-lg shadow-slate-500/20 border border-transparent',
    blue: 'bg-blue-500 hover:bg-blue-600 text-white shadow-lg shadow-blue-500/20 border border-transparent',
    purple:
      'bg-purple-500 hover:bg-purple-600 text-white shadow-lg shadow-purple-500/20 border border-transparent',
    emerald:
      'bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/20 border border-transparent',
    red: 'bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white shadow-lg shadow-red-500/20 hover:shadow-red-500/40 border border-transparent',
  },
  glass: {
    primary:
      'backdrop-blur-2xl backdrop-saturate-150 bg-white/40 hover:bg-indigo-50/60 text-slate-700 hover:text-indigo-700 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.5)] hover:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.7)] border border-white/50 hover:border-indigo-300/50 transition-all duration-300',
    neutral:
      'backdrop-blur-2xl backdrop-saturate-150 bg-white/40 hover:bg-white/60 text-slate-700 hover:text-slate-900 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.5)] hover:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.7)] border border-white/50 hover:border-slate-400/50 transition-all duration-300',
    blue: 'backdrop-blur-2xl backdrop-saturate-150 bg-blue-500/10 hover:bg-blue-500/30 text-blue-700 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.5)] hover:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.7)] border border-white/50 hover:border-blue-400/50 transition-all duration-300',
    purple:
      'backdrop-blur-2xl backdrop-saturate-150 bg-purple-500/10 hover:bg-purple-500/30 text-purple-700 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.5)] hover:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.7)] border border-white/50 hover:border-purple-400/50 transition-all duration-300',
    emerald:
      'backdrop-blur-2xl backdrop-saturate-150 bg-emerald-500/10 hover:bg-emerald-500/30 text-emerald-700 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.5)] hover:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.7)] border border-white/50 hover:border-emerald-400/50 transition-all duration-300',
    red: 'backdrop-blur-2xl backdrop-saturate-150 bg-red-500/10 hover:bg-red-500/30 text-red-700 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.5)] hover:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.7)] border border-white/50 hover:border-red-400/50 transition-all duration-300',
  },
  ghost: {
    primary: 'text-slate-500 hover:text-indigo-600 hover:bg-indigo-50',
    neutral: 'text-slate-500 hover:text-slate-700 hover:bg-slate-100/50',
    blue: 'text-slate-500 hover:text-blue-600 hover:bg-blue-50',
    purple: 'text-slate-500 hover:text-purple-600 hover:bg-purple-50',
    emerald: 'text-slate-500 hover:text-emerald-600 hover:bg-emerald-50',
    red: 'text-slate-500 hover:text-red-600 hover:bg-red-50',
  },
  outline: {
    primary:
      'border-2 border-slate-200 hover:border-indigo-500 text-slate-600 hover:text-indigo-600',
    neutral: 'border-2 border-slate-200 hover:border-slate-400 text-slate-600 hover:text-slate-800',
    blue: 'border-2 border-slate-200 hover:border-blue-500 text-slate-600 hover:text-blue-600',
    purple:
      'border-2 border-slate-200 hover:border-purple-500 text-slate-600 hover:text-purple-600',
    emerald:
      'border-2 border-slate-200 hover:border-emerald-500 text-slate-600 hover:text-emerald-600',
    red: 'border-2 border-slate-200 hover:border-red-500 text-slate-600 hover:text-red-600',
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
  variant = input<ButtonVariant | LegacyVariant>('solid'); // Allow legacy for now to prevent breakage
  shape = input<ButtonShape>('default');

  // Existing Inputs
  size = input<ButtonSize>('md');
  fullWidth = input<boolean>(false);
  disabled = input<boolean>(false);
  type = input<'button' | 'submit' | 'reset'>('button');
  icon = input<string | undefined>(undefined);
  title = input<string | undefined>(undefined); // Added title for tooltips

  isIconOnly = computed(() => this.shape() === 'circle' || this.shape() === 'square');

  computedClasses = computed(() => {
    const base =
      'inline-flex items-center justify-center font-bold transition-all focus:outline-none';
    const rawVariant = this.variant();
    const defaultPalette = this.palette();

    // Resolve effective variant/palette
    // Handle legacy mappings if 'variant' input matches legacy strings
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
      // It's a new variant string
      effectiveVariant = rawVariant as ButtonVariant;
      // effectivePalette remains defaultPalette
    }

    const styleClass =
      BUTTON_STYLES[effectiveVariant]?.[effectivePalette] || BUTTON_STYLES['solid']['primary'];
    const sizeClass = this.getSizeClasses(this.shape(), this.size());
    const widthClass = this.fullWidth() ? 'w-full' : '';
    const disabledClass = this.disabled()
      ? 'opacity-50 cursor-not-allowed pointer-events-none grayscale'
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
          return `px-5 py-2.5 text-sm ${rounded}`;
        case 'lg':
          return `px-6 py-3 text-base ${rounded}`;
      }
    } else {
      switch (size) {
        case 'sm':
          return `p-1.5 ${rounded}`;
        case 'md':
          return `p-2.5 ${rounded}`;
        case 'lg':
          return `p-3.5 ${rounded}`;
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
        return 18; // md
    }
  }

  handleClick(event: MouseEvent) {
    if (this.disabled()) {
      event.preventDefault();
      event.stopPropagation();
    }
  }
}
