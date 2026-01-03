import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { NotificationService } from '../../services/notification.service';

@Component({
  selector: 'app-snackbar',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  template: `
    @if (notification.message(); as msg) {
      <div
        class="fixed bottom-4 left-1/2 -translate-x-1/2 px-4 py-3 rounded-lg shadow-lg z-50 flex items-center gap-3 animate-slide-up"
        [class.bg-blue-600]="msg.type === 'info'"
        [class.bg-green-600]="msg.type === 'success'"
        [class.bg-red-600]="msg.type === 'error'"
      >
        @switch (msg.type) {
          @case ('info') {
            <lucide-icon name="info" class="w-5 h-5 text-white"></lucide-icon>
          }
          @case ('success') {
            <lucide-icon name="circle-check" class="w-5 h-5 text-white"></lucide-icon>
          }
          @case ('error') {
            <lucide-icon name="circle-alert" class="w-5 h-5 text-white"></lucide-icon>
          }
        }
        <span class="text-white text-sm font-medium">{{ msg.text }}</span>
        <button
          (click)="notification.dismiss()"
          class="ml-2 text-white/80 hover:text-white transition-colors"
        >
          <lucide-icon name="x" class="w-4 h-4"></lucide-icon>
        </button>
      </div>
    }
  `,
  styles: [
    `
      :host {
        display: contents;
      }
    `,
  ],
})
export class SnackbarComponent {
  readonly notification = inject(NotificationService);
}
