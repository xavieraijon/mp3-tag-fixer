import { Component, inject, signal } from '@angular/core';
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
import { AuthService } from './services/auth.service';
import { MusicBrainzService } from './services/musicbrainz.service';
import { AiSearchService } from './services/ai-search.service';
import { YoutubeService, YoutubeDownloadResponse } from './services/youtube.service';

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
import { LoginComponent } from './components/auth/login.component';
import { RegisterComponent } from './components/auth/register.component';
import { ButtonComponent } from './components/ui/button/button.component';
import { YoutubeModalComponent } from './components/youtube-modal/youtube-modal.component';

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
    SnackbarComponent,
    LoginComponent,
    RegisterComponent,
    ButtonComponent,
    YoutubeModalComponent,
  ],
  templateUrl: './app.component.html',
})
export class AppComponent {
  // Services
  private readonly discogs = inject(DiscogsService);
  private readonly processor = inject(FileProcessorService);
  private readonly searchService = inject(SearchService);
  private readonly trackMatcher = inject(TrackMatcherService);
  private readonly stringUtils = inject(StringUtilsService);
  private readonly mbService = inject(MusicBrainzService);
  private readonly notification = inject(NotificationService);
  readonly authService = inject(AuthService); // Public for template
  readonly aiService = inject(AiSearchService); // Public for template (toggle)
  private readonly youtubeService = inject(YoutubeService);

  // Store (exposed for template)
  readonly store = inject(FilesStore);

  // Auth modal state
  readonly showLoginModal = signal(false);
  readonly showRegisterModal = signal(false);
  readonly showYoutubeModal = signal(false);
  readonly showUserMenu = signal(false);

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

  /**
   * Handles YouTube download completion
   * Adds the downloaded file to the store and triggers search
   */
  async handleYoutubeDownload(response: YoutubeDownloadResponse): Promise<void> {
    // Create a ProcessedFile from the YouTube download response
    const processedFile: ProcessedFile = {
      file: new File([], response.originalName), // Dummy file, actual data stored on server
      originalName: response.originalName,
      currentTags: response.currentTags as ProcessedFile['currentTags'],
      status: 'pending',
      searchResults: [],
      tracks: [],
      manualArtist: response.parsedFilename.artist || response.youtubeInfo?.channel || '',
      manualTitle: response.parsedFilename.title || response.youtubeInfo?.title || '',
      serverFileId: response.fileId, // Store server file ID for later download
    };

    // Add to store
    this.store.addProcessedFile(processedFile);

    // Trigger automatic search
    const addedFile = this.store.getFileByName(response.originalName);
    if (addedFile) {
      await this.search(addedFile);
    }
  }

  // === Search ===

  // === Search ===

  async search(item: ProcessedFile): Promise<void> {
    // DEBUG MODE FLOW
    if (this.store.debugMode()) {
      await this.runDebugSearch(item);
      return;
    }

    // STANDARD FLOW (FAST FAIL)
    // Collect all possible sources for artist/title
    const sources = {
      manual: { artist: item.manualArtist || '', title: item.manualTitle || '' },
      tags: { artist: item.currentTags?.artist || '', title: item.currentTags?.title || '' },
      filename: this.processor.parseFilename(item.originalName),
    };

    let primaryArtist = sources.manual.artist || sources.tags.artist;
    let primaryTitle = sources.manual.title || sources.tags.title;

    // NOTE: We do NOT fallback to sources.filename here for the search query.
    // We want the backend (Intelligent Heuristics) to parse the filename if manual/tags are missing.
    let usedAcoustid = false;

    // Update status to show we're starting
    let aiConfidence: number | undefined;

    this.store.updateFile(item, {
      status: 'searching',
      statusMessage: 'Analyzing file...',
      searchResults: [],
      selectedRelease: undefined,
      releaseDetails: undefined,
      tracks: [],
      selectedTrack: undefined,
      coverImageUrl: undefined,
    });

    // Try AcoustID first (audio fingerprint) - most reliable for identification
    if (this.aiService.enabled()) {
      this.store.updateFile(item, { statusMessage: 'Analyzing audio fingerprint...' });

      const acoustidResult = await this.aiService.identifyByFingerprint(item.file);

      if (acoustidResult && acoustidResult.confidence >= 0.8) {
        console.log(
          `[Search] AcoustID identified: "${acoustidResult.artist} - ${acoustidResult.title}" (confidence: ${acoustidResult.confidence})`,
        );
        primaryArtist = acoustidResult.artist;
        primaryTitle = acoustidResult.title;
        usedAcoustid = true;
        aiConfidence = acoustidResult.confidence;

        // Update manual fields with AcoustID result
        this.store.updateFile(item, {
          manualArtist: primaryArtist,
          manualTitle: primaryTitle,
          statusMessage: `🎵 Audio identified: "${primaryArtist} - ${primaryTitle}"`,
        });
      }
    }

    // No logic for "fallback AI" here anymore. It's delegated to the backend.

    if (!primaryArtist && !primaryTitle && !sources.filename.title && !item.originalName) {
      // checks if we have ABSOLUTELY nothing to go on.
      // sources.filename.title is just a proxy for "do we have a filename"?
      // item.originalName is better.

    }

    this.store.updateFile(item, {
      statusMessage: usedAcoustid
        ? `Searching: "${primaryArtist} - ${primaryTitle}"...`
        : 'Searching via Intelligent Backend...',
    });

    try {
      await this.performDiscogsSearch(
        item,
        primaryArtist,
        primaryTitle,
        usedAcoustid,
        this.aiService.enabled(), // useAiFallback: Backend decides if parsing fails
        aiConfidence,
      );
    } catch (e) {
      console.error('[Search] Error:', e);
      this.store.updateFile(item, {
        status: 'error',
        statusMessage: 'Search failed. Please try again.',
      });
    }
  }

  // === Helper for Standard Search ===
  private async performDiscogsSearch(
    item: ProcessedFile,
    artist: string,
    title: string,
    isAcoustid: boolean,
    useAiFallback: boolean,
    aiConfidence?: number,
  ) {
    const results = await this.searchService.search(
      artist,
      title,
      (message) => this.store.updateFile(item, { statusMessage: message }),
      aiConfidence,
      item.originalName, // Pass filename for heuristic analysis
      item.currentTags?.duration, // Pass duration for track matching
      useAiFallback,
    );

    if (results.length > 0) {
      const aiLabel = isAcoustid ? ' (🎵 audio match)' : '';
      this.store.updateFile(item, {
        status: 'ready',
        searchResults: results,
        statusMessage: `Found ${results.length} results${aiLabel}. Selecting best match...`,
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
        statusMessage: 'No results found. Try editing artist/title.',
      });
    }
  }

  // === Debug Search Logic ===
  private async runDebugSearch(item: ProcessedFile) {
    // Initialize Debug State
    this.store.updateFile(item, {
      status: 'searching',
      statusMessage: 'Running Step-by-Step Debug...',
      debugData: {
        enabled: true,
        currentStepIndex: 0,
        steps: [
          { name: 'AcoustID', status: 'pending' },
          { name: 'Groq AI', status: 'pending' },
          { name: 'Traditional', status: 'pending' },
        ],
      },
    });

    interface BestResult {
      artist: string;
      title: string;
      confidence: number;
    }
    let bestResult: BestResult | null = null;

    // Helper to trigger UI update with the best result found so far
    let searchTriggered = false;
    const tryUpdateUI = (res: BestResult) => {
      if (!searchTriggered) {
        searchTriggered = true;
        this.store.updateFile(item, {
          manualArtist: res.artist,
          manualTitle: res.title,
          statusMessage: `Early match: ${res.artist} - ${res.title}`,
        });
        this.performDiscogsSearch(item, res.artist, res.title, false, true, res.confidence);
      }
    };

    // --- STEP 1: AcoustID ---
    this.store.updateDebugStep(item, 0, { status: 'running', logs: ['Generating fingerprint...'] });
    const start1 = Date.now();
    try {
      if (this.aiService.enabled()) {
        const res = await this.aiService.identifyByFingerprint(item.file);
        const duration = Date.now() - start1;

        if (res && res.confidence >= 0.8) {
          this.store.updateDebugStep(item, 0, {
            status: 'success',
            result: res,
            durationMs: duration,
            logs: [`Matched recording (conf: ${res.confidence})`],
          });
          // Prioritize this result
          if (!bestResult || res.confidence > (bestResult as BestResult).confidence) {
            bestResult = { artist: res.artist, title: res.title, confidence: res.confidence };
            tryUpdateUI(bestResult);
          }
        } else {
          this.store.updateDebugStep(item, 0, {
            status: 'failed',
            durationMs: duration,
            logs: ['No high confidence match found'],
          });
        }
      } else {
        this.store.updateDebugStep(item, 0, { status: 'skipped', logs: ['AI Service disabled'] });
      }
    } catch {
      this.store.updateDebugStep(item, 0, {
        status: 'failed',
        durationMs: Date.now() - start1,
        logs: ['Error executing AcoustID'],
      });
    }

    // --- STEP 2: Groq AI ---
    this.store.updateDebugStep(item, 1, { status: 'running', logs: ['Sending to Llama 3...'] });
    const start2 = Date.now();
    try {
      if (this.aiService.enabled()) {
        const res = await this.aiService.parseFilename(
          item.originalName,
          item.currentTags?.artist,
          item.currentTags?.title,
        );
        const duration = Date.now() - start2;

        if (res && res.confidence >= 0.7) {
          this.store.updateDebugStep(item, 1, {
            status: 'success',
            result: res,
            durationMs: duration,
          });
          // Use this if we don't have a better one yet (AcoustID wins usually)
          if (!bestResult || res.confidence > (bestResult as BestResult).confidence) {
            bestResult = res;
            tryUpdateUI(bestResult);
          }
        } else {
          this.store.updateDebugStep(item, 1, {
            status: 'failed',
            result: res || undefined,
            durationMs: duration,
            logs: ['Confidence too low'],
          });
        }
      } else {
        this.store.updateDebugStep(item, 1, { status: 'skipped', logs: ['AI Service disabled'] });
      }
    } catch {
      this.store.updateDebugStep(item, 1, { status: 'failed', durationMs: Date.now() - start2 });
    }

    // --- STEP 3: Traditional ---
    this.store.updateDebugStep(item, 2, { status: 'running' });
    const start3 = Date.now();
    // Simulate "Traditional" result using processor
    const tradRes = this.processor.parseFilename(item.originalName);
    const duration3 = Date.now() - start3;

    // Traditional always "succeeds" in producing a result, but quality varies
    this.store.updateDebugStep(item, 2, {
      status: 'success',
      result: { artist: tradRes.artist, title: tradRes.title, confidence: 0.5 },
      durationMs: duration3,
    });

    if (!bestResult) {
      bestResult = { ...tradRes, confidence: 0.5 };
      tryUpdateUI(bestResult);
    }

    // --- FINISH ---
    this.store.updateFile(item, {
      statusMessage: `Debug complete. Using: ${bestResult.artist} - ${bestResult.title}`,
      manualArtist: bestResult.artist,
      manualTitle: bestResult.title,
    });

    // Continue to search
    await this.performDiscogsSearch(item, bestResult.artist, bestResult.title, false, false);
  }

  async selectRelease(item: ProcessedFile, release: DiscogsRelease): Promise<void> {
    this.store.updateFile(item, {
      selectedRelease: release,
      status: 'loading_details',
      statusMessage: 'Loading tracklist...',
    });

    try {
      let details: DiscogsRelease | null = null;

      if (release.source === 'musicbrainz') {
        details = await this.mbService.getReleaseDetails(release.id as string);
      } else {
        details = await this.discogs.getReleaseDetails(
          release.id as number,
          release.type || 'release',
        );
      }

      if (!details) throw new Error('Could not fetch release details');

      const tracks = details.tracklist || [];
      const coverImageUrl = details.cover_image || release.thumb;

      // Auto-match track
      const matchedTrack = await this.trackMatcher.findBestMatch(item, tracks);

      if (matchedTrack) {
        this.store.updateFile(item, {
          releaseDetails: details,
          tracks: tracks,
          selectedTrack: matchedTrack,
          coverImageUrl: coverImageUrl,
          status: 'ready',
          statusMessage: `Auto-matched: "${matchedTrack.title}"`,
        });
      } else {
        this.store.updateFile(item, {
          releaseDetails: details,
          tracks: tracks,
          coverImageUrl: coverImageUrl,
          status: 'ready',
          statusMessage: tracks.length > 0 ? 'Select a track.' : 'No tracks found.',
        });
      }
    } catch (e: unknown) {
      console.error('Error in selectRelease:', e);
      this.store.updateFile(item, {
        status: 'error',
        statusMessage: 'Failed to load details.',
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
        statusMessage: `BPM: ${bpm}`,
      });
    } else {
      this.store.updateFile(item, {
        isAnalyzingBpm: false,
        statusMessage: 'BPM detection failed.',
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
        const artistFromRelease = this.stringUtils
          .normalizeSuperscripts(release.artist || '')
          .replace(/\*+$/, '')
          .trim();
        const finalArtist =
          item.manualArtist || artistFromRelease || track.artists?.[0]?.name || 'Unknown';
        const cleanName = this.processor.sanitizeFileName(`${finalArtist} - ${track.title}`);
        saveAs(blob, `${cleanName}.mp3`);
        this.store.updateFile(item, { status: 'done', statusMessage: 'Download started.' });
      }
    } catch {
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

  async autoProcessAll(): Promise<void> {
    const files = this.store.getSearchableFiles();
    const concurrency = 2; // Limit to 2 concurrent files to avoid rate limits

    // Simple chunked execution
    for (let i = 0; i < files.length; i += concurrency) {
      const chunk = files.slice(i, i + concurrency);
      await Promise.all(chunk.map((f) => this.search(f)));
    }
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

    for (const item of files) {
      try {
        const blob = await this.prepareFileBlob(item);
        if (blob) {
          const release = item.releaseDetails || item.selectedRelease!;
          const track = item.selectedTrack!;
          const artistFromRelease = this.stringUtils
            .normalizeSuperscripts(release.artist || '')
            .replace(/\*+$/, '')
            .trim();
          const finalArtist =
            item.manualArtist || artistFromRelease || track.artists?.[0]?.name || 'Unknown';
          const cleanName = this.processor.sanitizeFileName(`${finalArtist} - ${track.title}`);
          zip.file(`${cleanName}.mp3`, blob);
          completed++;
          this.notification.show(`Processing: ${completed}/${files.length}...`, 'info', 0);
        }
      } catch (e: unknown) {
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
      } catch {
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
    const artistFromRelease = this.stringUtils
      .normalizeSuperscripts(release.artist || '')
      .replace(/\*+$/, '')
      .trim();
    const detectedArtist = item.manualArtist || '';
    const finalArtist =
      detectedArtist || artistFromRelease || track.artists?.[0]?.name || 'Unknown';

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
      ...item.tagOverrides,
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

    // For YouTube files (with serverFileId), use server-side tag writing
    if (item.serverFileId) {
      return this.youtubeService.writeTags(item.serverFileId, {
        title: finalTags.title,
        artist: finalTags.artist,
        album: finalTags.album,
        year: finalTags.year,
        genre: Array.isArray(finalTags.genre) ? finalTags.genre.join(', ') : finalTags.genre,
        trackNumber: finalTags.trackNumber,
        bpm: finalTags.bpm,
        label: finalTags.label,
        albumArtist: finalTags.albumArtist,
        composer: finalTags.composer,
        comment: finalTags.comment,
        coverImageUrl: release.cover_image,
      });
    }

    // For local files, use client-side tag writing
    return this.processor.writeTags(item.file, finalTags);
  }

  // === Auth Methods ===

  toggleUserMenu() {
    this.showUserMenu.update((v) => !v);
  }

  async logout() {
    this.showUserMenu.set(false);
    await this.authService.logout();
    this.notification.show('Signed out successfully', 'success');
  }

  switchToRegister() {
    this.showLoginModal.set(false);
    this.showRegisterModal.set(true);
  }

  switchToLogin() {
    this.showRegisterModal.set(false);
    this.showLoginModal.set(true);
  }
}
