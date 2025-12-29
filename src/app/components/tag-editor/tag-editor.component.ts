import { Component, model, output, input, effect, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { Mp3Tags } from '../../models/mp3-tags.model';

@Component({
  selector: 'app-tag-editor',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  templateUrl: './tag-editor.html',
  styleUrls: ['./tag-editor.css']
})
export class TagEditorComponent {
  // Input from parent
  tags = model.required<Mp3Tags>();
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

  // Outputs
  save = output<void>();
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
    });
  }

  onSave() {
    // Update the model with local values before emitting save
    this.tags.set({
      ...this.tags(),
      artist: this.artist(),
      title: this.title(),
      album: this.album(),
      year: this.year(),
      genre: this.genre(),
      bpm: this.bpm(),
      label: this.label() || undefined,
      albumArtist: this.albumArtist() || undefined
    });
    this.save.emit();
  }
}

