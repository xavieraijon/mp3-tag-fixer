import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';

@Component({
  selector: 'app-modal',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  template: `
    <div
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/30 backdrop-blur-sm animate-in fade-in duration-200"
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
        class="relative z-10 bg-white opacity-80 rounded-3xl shadow-2xl w-full border border-slate-100 overflow-hidden flex flex-col max-h-[90vh] transition-all duration-300"
        [ngClass]="maxWidth()"
      >
        <!-- Header -->
        <div class="p-5 border-b border-slate-100 flex items-center gap-4 bg-white flex-shrink-0">
          <div class="flex-1 min-w-0">
            <ng-content select="[header]"></ng-content>
            @if (title()) {
              <h2 class="text-lg font-bold text-slate-900 truncate">{{ title() }}</h2>
            }
          </div>
          <button
            (click)="closeModal.emit()"
            class="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all flex-shrink-0"
          >
            <lucide-icon name="x" class="w-5 h-5"></lucide-icon>
          </button>
        </div>

        <!-- Body -->
        <div class="p-5 overflow-y-auto custom-scrollbar">
          <ng-content></ng-content>
        </div>

        <!-- Footer -->
        <div class="p-5 border-t border-slate-100 flex flex-col gap-4 bg-slate-50 flex-shrink-0">
          <!-- Main Footer Actions -->
          <div
            class="flex gap-3"
            [ngClass]="{
              'justify-start': footerAlign() === 'start',
              'justify-center': footerAlign() === 'center',
              'justify-end': footerAlign() === 'end',
            }"
          >
            <ng-content select="[footer]"></ng-content>
          </div>

          <!-- Sub-footer (Optional links like 'Forgot password') -->
          <div class="flex justify-center text-sm">
            <ng-content select="[sub-footer]"></ng-content>
          </div>
        </div>
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
  closeModal = output<void>();
}
