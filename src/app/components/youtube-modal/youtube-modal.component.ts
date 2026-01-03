import { Component, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { YoutubeInputComponent } from '../youtube-input/youtube-input.component';
import { ModalComponent } from '../ui/modal/modal.component';
import { YoutubeDownloadResponse } from '../../services/youtube.service';

@Component({
  selector: 'app-youtube-modal',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, ModalComponent, YoutubeInputComponent],
  templateUrl: './youtube-modal.component.html',
  styleUrl: './youtube-modal.component.css',
})
export class YoutubeModalComponent {
  closed = output<void>();
  downloaded = output<YoutubeDownloadResponse>();

  onDownloaded(response: YoutubeDownloadResponse) {
    this.downloaded.emit(response);
    this.closed.emit();
  }
}
