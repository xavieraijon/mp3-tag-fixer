import { Component, inject } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';
import { ThemeService } from '../../../services/theme.service';

@Component({
  selector: 'app-theme-toggle',
  standalone: true,
  imports: [LucideAngularModule],
  template: `
    <button
      type="button"
      (click)="themeService.toggle()"
      class="relative p-2.5 rounded-xl glass-card text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all duration-300 hover:scale-105 active:scale-95"
      [attr.aria-label]="
        themeService.isDark() ? 'Switch to light mode' : 'Switch to dark mode'
      "
      [attr.aria-pressed]="themeService.isDark()"
    >
      <div class="relative w-5 h-5">
        <!-- Sun icon -->
        <lucide-icon
          name="sun"
          class="absolute inset-0 w-5 h-5 transition-all duration-300"
          [class.opacity-0]="!themeService.isDark()"
          [class.rotate-90]="!themeService.isDark()"
          [class.scale-0]="!themeService.isDark()"
          [class.opacity-100]="themeService.isDark()"
          [class.rotate-0]="themeService.isDark()"
          [class.scale-100]="themeService.isDark()"
        ></lucide-icon>
        <!-- Moon icon -->
        <lucide-icon
          name="moon"
          class="absolute inset-0 w-5 h-5 transition-all duration-300"
          [class.opacity-100]="!themeService.isDark()"
          [class.rotate-0]="!themeService.isDark()"
          [class.scale-100]="!themeService.isDark()"
          [class.opacity-0]="themeService.isDark()"
          [class.-rotate-90]="themeService.isDark()"
          [class.scale-0]="themeService.isDark()"
        ></lucide-icon>
      </div>
    </button>
  `,
})
export class ThemeToggleComponent {
  readonly themeService = inject(ThemeService);
}
