import { Injectable, signal } from '@angular/core';

export interface Notification {
  id: number;
  text: string;
  type: 'info' | 'success' | 'error';
}

/**
 * Service for managing global notifications/snackbars.
 * Uses Angular Signals for reactive state management.
 */
@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private readonly _message = signal<Notification | null>(null);
  private _nextId = 0;
  private _dismissTimeout: ReturnType<typeof setTimeout> | null = null;

  /** Current notification (or null if none) */
  readonly message = this._message.asReadonly();

  /**
   * Shows a notification message.
   * @param text - Message text to display
   * @param type - Type of notification (info, success, error)
   * @param duration - Duration in ms (0 = no auto-dismiss)
   */
  show(text: string, type: 'info' | 'success' | 'error' = 'info', duration: number = 4000): void {
    // Clear any existing timeout
    if (this._dismissTimeout) {
      clearTimeout(this._dismissTimeout);
      this._dismissTimeout = null;
    }

    const notification: Notification = {
      id: this._nextId++,
      text,
      type
    };

    this._message.set(notification);

    if (duration > 0) {
      this._dismissTimeout = setTimeout(() => {
        this.dismiss();
      }, duration);
    }
  }

  /**
   * Shows an info notification.
   */
  info(text: string, duration: number = 4000): void {
    this.show(text, 'info', duration);
  }

  /**
   * Shows a success notification.
   */
  success(text: string, duration: number = 4000): void {
    this.show(text, 'success', duration);
  }

  /**
   * Shows an error notification.
   */
  error(text: string, duration: number = 5000): void {
    this.show(text, 'error', duration);
  }

  /**
   * Dismisses the current notification.
   */
  dismiss(): void {
    if (this._dismissTimeout) {
      clearTimeout(this._dismissTimeout);
      this._dismissTimeout = null;
    }
    this._message.set(null);
  }
}
