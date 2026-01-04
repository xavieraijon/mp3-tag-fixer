import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';

@Component({
  selector: 'app-modal',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  template: `
    <div
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 dark:bg-black/60 backdrop-blur-sm animate-fade-in"
    >
      <!-- Backdrop click handler -->
      <button
        type="button"
        class="absolute inset-0 w-full h-full cursor-default focus:outline-none"
        (click)="closeModal.emit()"
        tabindex="-1"
        aria-label="Close modal"
      ></button>

      <div
        class="relative z-10 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl dark:shadow-slate-900/50 w-full border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col max-h-[90vh] animate-scale-in"
        [ngClass]="maxWidth()"
      >
        <!-- Header -->
        <div
          class="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex items-center gap-4 bg-white dark:bg-slate-800 flex-shrink-0"
        >
          <div class="flex-1 min-w-0">
            <ng-content select="[header]"></ng-content>
            @if (title()) {
              <h2 class="text-lg font-bold text-slate-900 dark:text-slate-100 truncate">
                {{ title() }}
              </h2>
            }
          </div>
          <button
            (click)="closeModal.emit()"
            class="p-2 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-all flex-shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:focus-visible:ring-indigo-400"
            aria-label="Close modal"
          >
            <lucide-icon name="x" class="w-5 h-5"></lucide-icon>
          </button>
        </div>

        <!-- Body -->
        <div class="px-6 py-5 overflow-y-auto">
          <ng-content></ng-content>
        </div>

        <!-- Footer -->
        @if (showFooter()) {
          <div
            class="px-6 py-4 border-t border-slate-200 dark:border-slate-700 flex flex-col gap-4 bg-slate-50 dark:bg-slate-900/50 flex-shrink-0"
          >
            <!-- Main Footer Actions -->
            <div
              class="flex gap-3"
              [ngClass]="{
                'justify-start': footerAlign() === 'start',
                'justify-center': footerAlign() === 'center',
                'justify-end': footerAlign() === 'end'
              }"
            >
              <ng-content select="[footer]"></ng-content>
            </div>

            <!-- Sub-footer (Optional links like 'Forgot password') -->
            <div class="flex justify-center text-sm">
              <ng-content select="[sub-footer]"></ng-content>
            </div>
          </div>
        }
      </div>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
      }
    `,
  ],
})
export class ModalComponent {
  title = input<string>('');
  maxWidth = input<string>('max-w-lg');
  footerAlign = input<'start' | 'center' | 'end'>('end');
  showFooter = input<boolean>(true);
  closeModal = output<void>();
}
