import { Component, signal, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';

@Component({
  selector: 'app-dropzone',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  templateUrl: './dropzone.component.html',
  styleUrl: './dropzone.component.css'
})
export class DropzoneComponent {
  filesDropped = output<File[]>();
  isDragging = signal(false);

  onDragOver(event: DragEvent) {
    event.preventDefault();
    this.isDragging.set(true);
  }

  onDragLeave(event: DragEvent) {
    event.preventDefault();
    this.isDragging.set(false);
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    this.isDragging.set(false);

    if (event.dataTransfer?.files) {
      const newFiles = Array.from(event.dataTransfer.files).filter(f =>
        f.type === 'audio/mpeg' || f.name.toLowerCase().endsWith('.mp3')
      );
      if (newFiles.length > 0) {
        this.filesDropped.emit(newFiles);
      }
    }
  }
}
