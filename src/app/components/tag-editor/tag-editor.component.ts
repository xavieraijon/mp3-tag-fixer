import { Component, output, input, effect, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { Mp3Tags } from '../../models/mp3-tags.model';
import { ModalComponent } from '../ui/modal/modal.component';
import { ButtonComponent } from '../ui/button/button.component';
import { InputComponent } from '../ui/input/input.component';

@Component({
  selector: 'app-tag-editor',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule, ModalComponent, ButtonComponent, InputComponent],
  templateUrl: './tag-editor.component.html',
  styleUrl: './tag-editor.component.css'
})
export class TagEditorComponent {
  // Inputs from parent
  tags = input.required<Mp3Tags>();
  coverImageUrl = input<string>();

  // Local form state
  artist = signal('');
  title = signal('');
  album = signal('');
  year = signal<number | undefined>(undefined);
  genre = signal('');
  bpm = signal<number | undefined>(undefined);
  label = signal('');
  albumArtist = signal('');
  trackNumber = signal<number | undefined>(undefined);
  discNumber = signal('');
  composer = signal('');
  comment = signal('');

  // Outputs - save emits the edited tags
  save = output<Mp3Tags>();
  cancel = output<void>();

  constructor() {
    // Sync local state when tags input changes
    effect(() => {
      const t = this.tags();
      this.artist.set(t.artist || '');
      this.title.set(t.title || '');
      this.album.set(t.album || '');
      this.year.set(t.year);
      this.genre.set(Array.isArray(t.genre) ? t.genre.join(', ') : (t.genre || ''));
      this.bpm.set(t.bpm);
      this.label.set(t.label || '');
      this.albumArtist.set(t.albumArtist || '');
      this.trackNumber.set(t.trackNumber);
      this.discNumber.set(t.discNumber || '');
      this.composer.set(t.composer || '');
      this.comment.set(t.comment || '');
    });
  }

  onSave() {
    // Helper to normalize empty values
    const str = (v: string): string | undefined => v?.trim() || undefined;
    const num = (v: number | undefined | null): number | undefined =>
      (v !== undefined && v !== null && !isNaN(v)) ? v : undefined;

    // Build the updated tags object (don't spread original - we want explicit values)
    const updatedTags: Mp3Tags = {
      artist: str(this.artist()),
      title: str(this.title()),
      album: str(this.album()),
      year: num(this.year()),
      genre: str(this.genre()),
      bpm: num(this.bpm()),
      label: str(this.label()),
      albumArtist: str(this.albumArtist()),
      trackNumber: num(this.trackNumber()),
      discNumber: str(this.discNumber()),
      composer: str(this.composer()),
      comment: str(this.comment()),
      // Preserve image from original
      image: this.tags().image
    };

    console.log('[TagEditor] Saving:', updatedTags);
    this.save.emit(updatedTags);
  }
}

