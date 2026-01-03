import { Component, signal, computed, output, inject } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';
import { YoutubeService, YoutubeDownloadResponse } from '../../services/youtube.service';
import { NotificationService } from '../../services/notification.service';

@Component({
  selector: 'app-youtube-input',
  standalone: true,
  imports: [LucideAngularModule],
  templateUrl: './youtube-input.component.html',
})
export class YoutubeInputComponent {
  private readonly youtubeService = inject(YoutubeService);
  private readonly notificationService = inject(NotificationService);

  // State
  readonly url = signal('');
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  // Output event when download completes
  readonly downloaded = output<YoutubeDownloadResponse>();

  // Computed validation
  readonly isValid = computed(() => {
    const currentUrl = this.url();
    return currentUrl.length > 0 && this.youtubeService.isValidUrl(currentUrl);
  });

  onUrlChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.url.set(input.value);
    this.error.set(null);
  }

  async download(): Promise<void> {
    const currentUrl = this.url();

    if (!currentUrl) {
      this.error.set('Please enter a YouTube URL');
      return;
    }

    if (!this.youtubeService.isValidUrl(currentUrl)) {
      this.error.set('Invalid YouTube URL format');
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    try {
      const result = await this.youtubeService.download(currentUrl);
      this.downloaded.emit(result);
      this.url.set(''); // Clear input on success
      this.notificationService.success(`Downloaded: ${result.originalName}`);
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : (err as { error?: { message?: string } })?.error?.message ||
            'Failed to download audio';
      this.error.set(message);
      this.notificationService.error(message);
    } finally {
      this.loading.set(false);
    }
  }
}
