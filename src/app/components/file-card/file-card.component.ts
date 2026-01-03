import { Component, input, output, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { ProcessedFile } from '../../models/processed-file.model';
import { DiscogsRelease, DiscogsTrack } from '../../models/discogs.model';
import { ButtonComponent } from '../ui/button/button.component';
import { DebugStepperComponent } from '../debug-stepper/debug-stepper.component';

@Component({
  selector: 'app-file-card',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule, ButtonComponent, DebugStepperComponent],
  templateUrl: './file-card.component.html',
  styleUrl: './file-card.component.css',
})
export class FileCardComponent {
  item = input.required<ProcessedFile>();

  // Events
  requestSearch = output<void>();
  edit = output<void>();
  remove = output<void>();
  download = output<void>();
  selectRelease = output<DiscogsRelease>();
  selectTrack = output<DiscogsTrack>();
  detectBpm = output<void>();
  artistChange = output<string>();
  titleChange = output<string>();

  // Helpers
  hasMatch = computed(() => !!this.item().selectedTrack);

  onArtistChange(value: string) {
    this.artistChange.emit(value);
  }

  onTitleChange(value: string) {
    this.titleChange.emit(value);
  }

  onSelectRelease(release: DiscogsRelease) {
    this.selectRelease.emit(release);
  }

  onSelectTrack(track: DiscogsTrack) {
    this.selectTrack.emit(track);
  }

  onReleaseSelectChange(releaseId: string) {
    if (!releaseId) return;
    const release = this.item().searchResults?.find((r) => r.id.toString() === releaseId);
    if (release) {
      this.selectRelease.emit(release);
    }
  }

  onTrackSelectChange(position: string) {
    if (!position) return;
    const track = this.item().tracks?.find((t) => t.position === position);
    if (track) {
      this.selectTrack.emit(track);
    }
  }

  getRealTracks(tracks: DiscogsTrack[]): DiscogsTrack[] {
    return tracks?.filter((t) => t.type_ === 'track') || [];
  }

  getSelectedReleaseId(): string {
    const id = this.item().selectedRelease?.id;
    return id ? id.toString() : '';
  }

  getDisplaySubtitle(item: ProcessedFile): string {
    if (item.selectedRelease && item.selectedTrack) {
      const rel = item.selectedRelease;
      const track = item.selectedTrack;
      // Display: "Release Title (Label) [Year] • Track 01"
      const label = rel.labels?.[0]?.name ? ` (${rel.labels[0].name})` : '';
      const year = rel.year ? ` [${rel.year}]` : '';
      return `${rel.title}${label}${year} • ${track.position}`;
    }
    return item.originalName;
  }

  // Format helper
  formatDuration(duration: string | undefined): string {
    return duration || '--:--';
  }

  /**
   * Get effective BPM considering tagOverrides.
   * If bpm was explicitly cleared in editor, show 'BPM' (the key exists but value is undefined).
   * If bpm was never edited, show currentTags.bpm.
   */
  getEffectiveBpm(): string | number {
    const item = this.item();
    // If tagOverrides has the 'bpm' key (even if undefined), use that value
    if (item.tagOverrides && 'bpm' in item.tagOverrides) {
      return item.tagOverrides.bpm ?? 'BPM';
    }
    // Otherwise fallback to currentTags
    return item.currentTags?.bpm ?? 'BPM';
  }

  getReleaseUrl(release: DiscogsRelease): string {
    if (!release) return '';
    if (release.source === 'musicbrainz') {
      return `https://musicbrainz.org/release/${release.id}`;
    }
    return `https://www.discogs.com/${release.type || 'release'}/${release.id}`;
  }
}
