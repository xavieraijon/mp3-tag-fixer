import { Component, input, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';

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
    >
      @if (icon()) {
        <lucide-icon [name]="icon()!" [size]="iconSize()" class="mr-2"></lucide-icon>
      }
      <ng-content></ng-content>
    </button>
  `
})
export class ButtonComponent {
  variant = input<ButtonVariant>('primary');
  size = input<ButtonSize>('md');
  fullWidth = input<boolean>(false);
  disabled = input<boolean>(false);
  type = input<'button' | 'submit' | 'reset'>('button');
  icon = input<string | undefined>(undefined);

  computedClasses = computed(() => {
    const baseClasses = 'inline-flex items-center justify-center font-bold transition-all rounded-xl focus:outline-none';

    // Variants
    const variants = {
      primary: 'bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40',
      secondary: 'text-slate-600 hover:text-slate-800 bg-white/40 hover:bg-white/60 border border-white/40 shadow-sm',
      danger: 'bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white shadow-lg shadow-red-500/20 hover:shadow-red-500/40',
      ghost: 'text-slate-500 hover:text-slate-700 hover:bg-slate-100/50'
    };

    // Sizes
    const sizes = {
      sm: 'px-3 py-1.5 text-xs',
      md: 'px-5 py-2.5 text-sm',
      lg: 'px-6 py-3 text-base'
    };

    const widthClass = this.fullWidth() ? 'w-full' : '';
    const disabledClass = this.disabled() ? 'opacity-50 cursor-not-allowed pointer-events-none grayscale' : '';

    return `${baseClasses} ${variants[this.variant()]} ${sizes[this.size()]} ${widthClass} ${disabledClass}`;
  });

  iconSize() {
    switch (this.size()) {
      case 'sm': return 14;
      case 'lg': return 20;
      default: return 18;
    }
  }

  handleClick(event: MouseEvent) {
    if (this.disabled()) {
      event.preventDefault();
      event.stopPropagation();
    }
  }
}
