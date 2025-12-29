import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

// Services
import { DiscogsService } from './services/discogs.service';
import { FileProcessorService } from './services/file-processor.service';
import { SearchService } from './services/search.service';
import { TrackMatcherService } from './services/track-matcher.service';
import { StringUtilsService } from './services/string-utils.service';
import { NotificationService } from './services/notification.service';

// Store
import { FilesStore } from './store/files.store';

// Models
import { ProcessedFile } from './models/processed-file.model';
import { Mp3Tags } from './models/mp3-tags.model';
import { DiscogsRelease, DiscogsTrack } from './models/discogs.model';

// Components
import { DropzoneComponent } from './components/dropzone/dropzone.component';
import { FilterBarComponent } from './components/filter-bar/filter-bar.component';
import { FileCardComponent } from './components/file-card/file-card.component';
import { TagEditorComponent } from './components/tag-editor/tag-editor.component';
import { SnackbarComponent } from './components/snackbar/snackbar.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    LucideAngularModule,
    DropzoneComponent,
    FilterBarComponent,
    FileCardComponent,
    TagEditorComponent,
    SnackbarComponent
  ],
  templateUrl: './app.component.html'
})
export class AppComponent {
  // Services
  private readonly discogs = inject(DiscogsService);
  private readonly processor = inject(FileProcessorService);
  private readonly searchService = inject(SearchService);
  private readonly trackMatcher = inject(TrackMatcherService);
  private readonly stringUtils = inject(StringUtilsService);
  private readonly notification = inject(NotificationService);

  // Store (exposed for template)
  readonly store = inject(FilesStore);

  // Expose signals for template binding
  readonly files = this.store.files;
  readonly filteredFiles = this.store.filteredFiles;
  readonly editingItem = this.store.editingItem;
  readonly editForm = this.store.editForm;
  readonly isAnalyzingBpm = this.store.isAnalyzingBpm;
  readonly isDownloadingZip = this.store.isDownloadingZip;

  // Filter query (two-way binding)
  get filterQuery(): string {
    return this.store.filter();
  }
  set filterQuery(value: string) {
    this.store.setFilter(value);
  }

  // === File Management ===

  async addFiles(newFiles: File[]): Promise<void> {
    await this.store.addFiles(newFiles);
  }

  removeFile(index: number): void {
    this.store.removeFileByIndex(index);
  }

  clearList(): void {
    if (confirm('Remove all listed files?')) {
      this.store.clearAll();
    }
  }

  // === Search ===

  async search(item: ProcessedFile): Promise<void> {
    const sources = {
      manual: { artist: item.manualArtist || '', title: item.manualTitle || '' },
      tags: { artist: item.currentTags?.artist || '', title: item.currentTags?.title || '' },
      filename: this.processor.parseFilename(item.originalName)
    };

    const primaryArtist = sources.manual.artist || sources.tags.artist || sources.filename.artist;
    const primaryTitle = sources.manual.title || sources.tags.title || sources.filename.title;

    if (!primaryArtist && !primaryTitle) {
      this.store.updateFile(item, {
        status: 'error',
        statusMessage: 'No artist or title found. Please enter manually.'
      });
      return;
    }

    this.store.updateFile(item, {
      status: 'searching',
      statusMessage: 'Analyzing search strategies...',
      searchResults: [],
      selectedRelease: undefined,
      releaseDetails: undefined,
      tracks: [],
      selectedTrack: undefined,
      coverImageUrl: undefined
    });

    try {
      const results = await this.searchService.search(
        primaryArtist,
        primaryTitle,
        (message) => this.store.updateFile(item, { statusMessage: message })
      );

      if (results.length > 0) {
        this.store.updateFile(item, {
          status: 'ready',
          searchResults: results,
          statusMessage: `Found ${results.length} results. Selecting best match...`
        });

        // Auto-select best result
        const updatedItem = this.store.getFileByName(item.originalName);
        if (updatedItem) {
          await this.selectRelease(updatedItem, results[0]);
        }
      } else {
        this.store.updateFile(item, {
          status: 'error',
          searchResults: [],
          statusMessage: 'No results found. Try editing artist/title.'
        });
      }
    } catch (e) {
      console.error('[Search] Error:', e);
      this.store.updateFile(item, {
        status: 'error',
        statusMessage: 'Search failed. Please try again.'
      });
    }
  }

  async selectRelease(item: ProcessedFile, release: DiscogsRelease): Promise<void> {
    this.store.updateFile(item, {
      selectedRelease: release,
      status: 'loading_details',
      statusMessage: 'Loading tracklist...'
    });

    try {
      const details = await this.discogs.getReleaseDetails(release.id, release.type || 'release');
      const tracks = details.tracklist || [];
      const coverImageUrl = details.cover_image || release.thumb;

      // Auto-match track
      const matchedTrack = this.trackMatcher.findBestMatch(item, tracks);

      if (matchedTrack) {
        this.store.updateFile(item, {
          releaseDetails: details,
          tracks: tracks,
          selectedTrack: matchedTrack,
          coverImageUrl: coverImageUrl,
          status: 'ready',
          statusMessage: `Auto-matched: "${matchedTrack.title}"`
        });
      } else {
        this.store.updateFile(item, {
          releaseDetails: details,
          tracks: tracks,
          coverImageUrl: coverImageUrl,
          status: 'ready',
          statusMessage: tracks.length > 0 ? 'Select a track.' : 'No tracks found.'
        });
      }
    } catch (e) {
      this.store.updateFile(item, {
        status: 'error',
        statusMessage: 'Failed to load details.'
      });
    }
  }

  selectTrack(item: ProcessedFile, track: DiscogsTrack): void {
    this.store.updateFile(item, { selectedTrack: track });
  }

  // === Actions ===

  async detectBpm(item: ProcessedFile): Promise<void> {
    this.store.updateFile(item, { isAnalyzingBpm: true, statusMessage: 'Detecting BPM...' });

    const bpm = await this.processor.detectBpm(item.file);

    if (bpm) {
      this.store.setTagOverrides(item, { bpm });
      this.store.updateFile(item, {
        isAnalyzingBpm: false,
        statusMessage: `BPM: ${bpm}`
      });
    } else {
      this.store.updateFile(item, {
        isAnalyzingBpm: false,
        statusMessage: 'BPM detection failed.'
      });
    }
  }

  async downloadFile(item: ProcessedFile): Promise<void> {
    if (!item.selectedRelease || !item.selectedTrack) return;

    this.store.updateFile(item, { status: 'searching', statusMessage: 'Writing tags...' });

    try {
      const blob = await this.prepareFileBlob(item);
      if (blob) {
        const release = item.releaseDetails || item.selectedRelease;
        const track = item.selectedTrack;
        const artistFromRelease = this.stringUtils.normalizeSuperscripts(release.artist || '').replace(/\*+$/, '').trim();
        const finalArtist = item.manualArtist || artistFromRelease || track.artists?.[0]?.name || 'Unknown';
        const cleanName = this.processor.sanitizeFileName(`${finalArtist} - ${track.title}`);
        saveAs(blob, `${cleanName}.mp3`);
        this.store.updateFile(item, { status: 'done', statusMessage: 'Download started.' });
      }
    } catch (e) {
      this.store.updateFile(item, { status: 'error', statusMessage: 'Failed to write tags.' });
    }
  }

  updateArtist(item: ProcessedFile, artist: string): void {
    this.store.updateArtist(item, artist);
  }

  updateTitle(item: ProcessedFile, title: string): void {
    this.store.updateTitle(item, title);
  }

  // === Bulk Actions ===

  autoProcessAll(): void {
    this.store.getSearchableFiles().forEach(f => this.search(f));
  }

  async analyzeAllBpm(): Promise<void> {
    const files = this.store.getFilesNeedingBpm();

    if (files.length === 0) {
      this.notification.info('All files already have BPM data.');
      return;
    }

    this.store.setAnalyzingBpm(true);
    this.notification.show(`Analyzing BPM for ${files.length} files...`, 'info', 0);

    let completed = 0;
    let failed = 0;

    for (const f of files) {
      try {
        await this.detectBpm(f);
        completed++;
        this.notification.show(`Analyzing BPM: ${completed}/${files.length}...`, 'info', 0);
      } catch (e) {
        failed++;
        console.error('BPM detection failed for', f.originalName, e);
      }
    }

    this.store.setAnalyzingBpm(false);

    if (failed > 0) {
      this.notification.error(`BPM analysis complete: ${completed} success, ${failed} failed.`);
    } else {
      this.notification.success(`BPM analysis complete: ${completed} files processed.`);
    }
  }

  async downloadAllZip(): Promise<void> {
    const files = this.store.getDownloadableFiles();

    if (files.length === 0) {
      this.notification.error('No files ready to download. Search and select tracks first.');
      return;
    }

    this.store.setDownloadingZip(true);
    this.notification.show(`Preparing ${files.length} files for download...`, 'info', 0);

    const zip = new JSZip();
    let completed = 0;
    let failed = 0;

    for (const item of files) {
      try {
        const blob = await this.prepareFileBlob(item);
        if (blob) {
          const release = item.releaseDetails || item.selectedRelease!;
          const track = item.selectedTrack!;
          const artistFromRelease = this.stringUtils.normalizeSuperscripts(release.artist || '').replace(/\*+$/, '').trim();
          const finalArtist = item.manualArtist || artistFromRelease || track.artists?.[0]?.name || 'Unknown';
          const cleanName = this.processor.sanitizeFileName(`${finalArtist} - ${track.title}`);
          zip.file(`${cleanName}.mp3`, blob);
          completed++;
          this.notification.show(`Processing: ${completed}/${files.length}...`, 'info', 0);
        }
      } catch (e) {
        failed++;
        console.error('Failed to process', item.originalName, e);
      }
    }

    if (completed > 0) {
      this.notification.show('Generating ZIP file...', 'info', 0);
      try {
        const zipBlob = await zip.generateAsync({ type: 'blob' });
        const timestamp = new Date().toISOString().slice(0, 10);
        saveAs(zipBlob, `mp3-tagged-${timestamp}.zip`);
        this.notification.success(`Download started: ${completed} files in ZIP.`);
      } catch (e) {
        this.notification.error('Failed to generate ZIP file.');
      }
    } else {
      this.notification.error('No files could be processed.');
    }

    this.store.setDownloadingZip(false);
  }

  // === Tag Editor ===

  openEditor(item: ProcessedFile): void {
    this.store.openEditor(item);
  }

  saveEditor(newTags: Mp3Tags): void {
    const saved = this.store.saveEditorTags(newTags);
    if (saved) {
      this.notification.success('Tags saved successfully.');
    }
  }

  closeEditor(): void {
    this.store.closeEditor();
  }

  // === Private Helpers ===

  /**
   * Prepares a file blob with tags written (used for both single and batch download)
   */
  private async prepareFileBlob(item: ProcessedFile): Promise<Blob | null> {
    if (!item.selectedRelease || !item.selectedTrack) return null;

    const release = item.releaseDetails || item.selectedRelease;
    const track = item.selectedTrack;

    // Build genre
    let genre: string[] = [];
    if (release.styles && release.styles.length > 0) {
      genre = release.styles;
    } else if (release.genres && release.genres.length > 0) {
      genre = release.genres;
    }

    // Get label
    const label = release.labels?.[0]?.name;

    // Determine artist
    const artistFromRelease = this.stringUtils.normalizeSuperscripts(release.artist || '').replace(/\*+$/, '').trim();
    const detectedArtist = item.manualArtist || '';
    const finalArtist = detectedArtist || artistFromRelease || track.artists?.[0]?.name || 'Unknown';

    const finalTags: Mp3Tags = {
      title: track.title,
      artist: finalArtist,
      album: release.title,
      year: release.year ? parseInt(String(release.year)) : undefined,
      genre: genre.length > 0 ? genre : undefined,
      label: label,
      albumArtist: artistFromRelease || release.artist,
      trackNumber: undefined,
      bpm: item.tagOverrides?.bpm || item.currentTags?.bpm,
      ...item.tagOverrides
    };

    // Parse track number
    if (track.position) {
      const num = parseInt(track.position.replace(/\D+/g, ''));
      if (!isNaN(num) && num > 0) finalTags.trackNumber = num;
    }

    // Fetch cover image
    if (release.cover_image && !finalTags.image) {
      const coverBlob = await this.discogs.fetchCoverImage(release.cover_image);
      if (coverBlob) {
        finalTags.image = coverBlob;
      }
    }

    return this.processor.writeTags(item.file, finalTags);
  }
}
