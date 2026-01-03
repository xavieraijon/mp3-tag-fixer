import { Component, signal, output, ViewChild, ElementRef } from '@angular/core';
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
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  filesDropped = output<File[]>();
  isDragging = signal(false);

  openFileDialog() {
    this.fileInput.nativeElement.click();
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files) {
      const newFiles = Array.from(input.files).filter(f =>
        f.type === 'audio/mpeg' || f.name.toLowerCase().endsWith('.mp3')
      );
      if (newFiles.length > 0) {
        this.filesDropped.emit(newFiles);
      }
      // Reset input value to allow selecting the same file again
      input.value = '';
    }
  }

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
