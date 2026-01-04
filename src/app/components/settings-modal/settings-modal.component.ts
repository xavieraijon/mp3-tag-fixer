import { Component, inject, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { ModalComponent } from '../ui/modal/modal.component';
import { AiSearchService } from '../../services/ai-search.service';
import { FilesStore } from '../../store/files.store';
import { ThemeService } from '../../services/theme.service';

@Component({
  selector: 'app-settings-modal',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, ModalComponent],
  template: `
    <app-modal
      maxWidth="max-w-md"
      (closeModal)="closeModal.emit()"
      [showFooter]="false"
    >
      <div header class="flex items-center gap-3">
        <div class="p-2 bg-slate-100 dark:bg-slate-700 rounded-lg">
          <lucide-icon name="settings" class="w-5 h-5 text-indigo-500 dark:text-indigo-400"></lucide-icon>
        </div>
        <h2 class="text-xl font-bold text-slate-900 dark:text-slate-100">Global Preferences</h2>
      </div>
      <div class="space-y-6">
        <!-- Theme Preference Section -->
        <div class="flex flex-col gap-3">
          <h3 class="font-medium text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <lucide-icon name="moon" class="w-5 h-5 text-indigo-500 dark:text-indigo-400"></lucide-icon>
            Appearance
          </h3>
          <div class="grid grid-cols-3 gap-2 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
            <!-- Light Mode -->
            <button
              (click)="themeService.setTheme('light')"
              class="relative flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200"
              [class.bg-white]="themeService.preference() === 'light'"
              [class.dark:bg-slate-700]="themeService.preference() === 'light'"
              [class.shadow-sm]="themeService.preference() === 'light'"
              [class.text-slate-900]="themeService.preference() === 'light'"
              [class.dark:text-white]="themeService.preference() === 'light'"
              [class.text-slate-500]="themeService.preference() !== 'light'"
              [class.hover:text-slate-700]="themeService.preference() !== 'light'"
              [class.dark:hover:text-slate-300]="themeService.preference() !== 'light'"
            >
              <lucide-icon name="sun" class="w-4 h-4"></lucide-icon>
              Light
            </button>

            <!-- Dark Mode -->
            <button
              (click)="themeService.setTheme('dark')"
              class="relative flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200"
              [class.bg-white]="themeService.preference() === 'dark'"
              [class.dark:bg-slate-700]="themeService.preference() === 'dark'"
              [class.shadow-sm]="themeService.preference() === 'dark'"
              [class.text-slate-900]="themeService.preference() === 'dark'"
              [class.dark:text-white]="themeService.preference() === 'dark'"
              [class.text-slate-500]="themeService.preference() !== 'dark'"
              [class.hover:text-slate-700]="themeService.preference() !== 'dark'"
              [class.dark:hover:text-slate-300]="themeService.preference() !== 'dark'"
            >
              <lucide-icon name="moon" class="w-4 h-4"></lucide-icon>
              Dark
            </button>

            <!-- System Mode -->
            <button
              (click)="themeService.setTheme('system')"
              class="relative flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200"
              [class.bg-white]="themeService.preference() === 'system'"
              [class.dark:bg-slate-700]="themeService.preference() === 'system'"
              [class.shadow-sm]="themeService.preference() === 'system'"
              [class.text-slate-900]="themeService.preference() === 'system'"
              [class.dark:text-white]="themeService.preference() === 'system'"
              [class.text-slate-500]="themeService.preference() !== 'system'"
              [class.hover:text-slate-700]="themeService.preference() !== 'system'"
              [class.dark:hover:text-slate-300]="themeService.preference() !== 'system'"
            >
              <lucide-icon name="monitor" class="w-4 h-4"></lucide-icon>
              System
            </button>
          </div>
        </div>

        <div class="h-px bg-slate-200 dark:bg-slate-700"></div>

        <!-- AI Toggle Section -->
        <div class="flex flex-col gap-2">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <lucide-icon
                name="sparkles"
                [class]="aiService.enabled() ? 'w-5 h-5 text-violet-500' : 'w-5 h-5 text-slate-400 dark:text-slate-500'"
              ></lucide-icon>
              <h3 class="font-medium text-slate-900 dark:text-slate-100">AI-Powered Search</h3>
            </div>

            <button
              (click)="aiService.setEnabled(!aiService.enabled())"
              role="switch"
              [attr.aria-checked]="aiService.enabled()"
              class="relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2"
              [class]="aiService.enabled() ? 'bg-indigo-600' : 'bg-slate-200 dark:bg-slate-700'"
            >
              <span
                class="pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out"
                [class]="aiService.enabled() ? 'translate-x-5' : 'translate-x-0'"
              ></span>
            </button>
          </div>
          <p class="text-sm text-slate-500 dark:text-slate-400 ml-7">
            Uses Groq LLM (Llama 3) for intelligent filename parsing and AcoustID for audio fingerprinting to identify tracks automatically.
          </p>
        </div>

        <div class="h-px bg-slate-200 dark:bg-slate-700"></div>

        <!-- Debug Toggle Section -->
        <div class="flex flex-col gap-2">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <lucide-icon
                name="bug"
                [class]="store.debugMode() ? 'w-5 h-5 text-amber-500' : 'w-5 h-5 text-slate-400 dark:text-slate-500'"
              ></lucide-icon>
              <h3 class="font-medium text-slate-900 dark:text-slate-100">Debug Mode</h3>
            </div>

            <button
              (click)="store.setDebugMode(!store.debugMode())"
              role="switch"
              [attr.aria-checked]="store.debugMode()"
              class="relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2"
              [class]="store.debugMode() ? 'bg-amber-500' : 'bg-slate-200 dark:bg-slate-700'"
            >
              <span
                class="pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out"
                [class]="store.debugMode() ? 'translate-x-5' : 'translate-x-0'"
              ></span>
            </button>
          </div>
          <p class="text-sm text-slate-500 dark:text-slate-400 ml-7">
            Enables detailed step-by-step logging of the search process. Useful for understanding how the app matches files.
          </p>
        </div>
      </div>
    </app-modal>
  `
})
export class SettingsModalComponent {
  readonly aiService = inject(AiSearchService);
  readonly store = inject(FilesStore);
  readonly themeService = inject(ThemeService);

  closeModal = output<void>();
}
