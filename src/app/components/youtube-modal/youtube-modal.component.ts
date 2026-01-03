import { Component, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { YoutubeInputComponent } from '../youtube-input/youtube-input.component';
import { YoutubeDownloadResponse } from '../../services/youtube.service';

@Component({
  selector: 'app-youtube-modal',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, YoutubeInputComponent],
  templateUrl: './youtube-modal.component.html',
  styleUrl: './youtube-modal.component.css'
})
export class YoutubeModalComponent {
  close = output<void>();
  downloaded = output<YoutubeDownloadResponse>();

  onDownloaded(response: YoutubeDownloadResponse) {
    this.downloaded.emit(response);
    this.close.emit();
  }

  onBackdropClick(event: MouseEvent) {
    if (event.target === event.currentTarget) {
      this.close.emit();
    }
  }
}
