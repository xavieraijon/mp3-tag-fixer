import { Injectable, computed, inject, signal } from '@angular/core';
import { ProcessedFile } from '../models/processed-file.model';
import { Mp3Tags } from '../models/mp3-tags.model';
import { FileProcessorService } from '../services/file-processor.service';
import { StringUtilsService } from '../services/string-utils.service';

/**
 * Central store for managing processed files state.
 * Uses Angular Signals for reactive state management.
 */
@Injectable({
  providedIn: 'root'
})
export class FilesStore {
  private readonly processor = inject(FileProcessorService);
  private readonly stringUtils = inject(StringUtilsService);

  // === Private State ===
  private readonly _files = signal<ProcessedFile[]>([]);
  private readonly _filter = signal<string>('');
  private readonly _editingItem = signal<ProcessedFile | null>(null);
  private readonly _editForm = signal<Mp3Tags>({});

  // Global action states
  private readonly _isAnalyzingBpm = signal(false);
  private readonly _isDownloadingZip = signal(false);
  private readonly _debugMode = signal(false);

  // === Public Readonly State ===
  readonly files = this._files.asReadonly();
  readonly filter = this._filter.asReadonly();
  readonly editingItem = this._editingItem.asReadonly();
  readonly editForm = this._editForm.asReadonly();
  readonly isAnalyzingBpm = this._isAnalyzingBpm.asReadonly();
  readonly isDownloadingZip = this._isDownloadingZip.asReadonly();
  readonly debugMode = this._debugMode.asReadonly();

  // === Computed State ===
  readonly filteredFiles = computed(() => {
    const query = this._filter().toLowerCase().trim();
    if (!query) return this._files();

    return this._files().filter(f =>
      f.originalName.toLowerCase().includes(query) ||
      f.selectedTrack?.title.toLowerCase().includes(query) ||
      f.manualArtist?.toLowerCase().includes(query) ||
      f.manualTitle?.toLowerCase().includes(query)
    );
  });

  readonly pendingCount = computed(() =>
    this._files().filter(f => f.status === 'pending').length
  );

  readonly readyCount = computed(() =>
    this._files().filter(f => f.status === 'ready' && f.selectedTrack).length
  );

  readonly totalCount = computed(() => this._files().length);

  // === File Management Methods ===

  /**
   * Adds multiple files to the store.
   */
  async addFiles(newFiles: File[]): Promise<void> {
    for (const file of newFiles) {
      await this.addFile(file);
    }
  }

  /**
   * Adds a single file to the store after processing.
   */
  async addFile(file: File): Promise<void> {
    // Skip duplicates
    if (this._files().some(f => f.originalName === file.name)) return;

    // Read ID3 tags
    let tags: Mp3Tags = {};
    try {
      tags = await this.processor.readTags(file);
    } catch (e) {
      console.warn('Could not read ID3 tags', e);
    }

    // Parse filename
    const { artist: parsedArtist, title: parsedTitle } = this.processor.parseFilename(file.name);

    // Determine valid tags (not raw filenames)
    const tagArtist = this.stringUtils.isValidTag(tags.artist) ? tags.artist : undefined;
    const tagTitle = this.stringUtils.isValidTag(tags.title) ? tags.title : undefined;

    // Prefer valid tags, fallback to parsed filename
    const initialArtist = tagArtist || parsedArtist;
    const initialTitle = tagTitle || parsedTitle;

    console.log(`[FilesStore] ${file.name}`);
    console.log(`  Tags: artist="${tags.artist || ''}" title="${tags.title || ''}"`);
    console.log(`  Parsed: artist="${parsedArtist}" title="${parsedTitle}"`);
    console.log(`  Final: artist="${initialArtist}" title="${initialTitle}"`);

    const newItem: ProcessedFile = {
      file,
      originalName: file.name,
      currentTags: tags,
      status: 'pending',
      statusMessage: 'Ready to search.',
      searchResults: [],
      tracks: [],
      manualArtist: initialArtist,
      manualTitle: initialTitle
    };

    this._files.update(current => [newItem, ...current]);
  }

  /**
   * Adds a pre-built ProcessedFile to the store (for YouTube downloads).
   */
  addProcessedFile(processedFile: ProcessedFile): void {
    // Skip duplicates
    if (this._files().some(f => f.originalName === processedFile.originalName)) return;
    this._files.update(current => [processedFile, ...current]);
  }

  /**
   * Updates a file by its original name.
   */
  updateFile(item: ProcessedFile, changes: Partial<ProcessedFile>): void {
    this._files.update(current =>
      current.map(f => f.originalName === item.originalName ? { ...f, ...changes } : f)
    );
  }

  /**
   * Updates a file by name with partial changes.
   */
  updateFileByName(name: string, changes: Partial<ProcessedFile>): void {
    this._files.update(current =>
      current.map(f => f.originalName === name ? { ...f, ...changes } : f)
    );
  }

  /**
   * Gets a file by its original name.
   */
  getFileByName(name: string): ProcessedFile | undefined {
    return this._files().find(f => f.originalName === name);
  }

  /**
   * Removes a file by index.
   */
  removeFileByIndex(index: number): void {
    this._files.update(current => current.filter((_, i) => i !== index));
  }

  /**
   * Removes a file by name.
   */
  removeFile(name: string): void {
    this._files.update(current => current.filter(f => f.originalName !== name));
  }

  /**
   * Clears all files from the store.
   */
  clearAll(): void {
    this._files.set([]);
  }

  // === Filter Methods ===

  setFilter(query: string): void {
    this._filter.set(query);
  }

  // === Specific Update Methods ===

  updateArtist(item: ProcessedFile, artist: string): void {
    this.updateFile(item, { manualArtist: artist });
  }

  updateTitle(item: ProcessedFile, title: string): void {
    this.updateFile(item, { manualTitle: title });
  }

  setTagOverrides(item: ProcessedFile, overrides: Partial<Mp3Tags>): void {
    const current = item.tagOverrides || {};
    this.updateFile(item, { tagOverrides: { ...current, ...overrides } });
  }

  // === Global Action State ===

  setAnalyzingBpm(value: boolean): void {
    this._isAnalyzingBpm.set(value);
  }

  setDownloadingZip(value: boolean): void {
    this._isDownloadingZip.set(value);
  }

  setDebugMode(value: boolean): void {
    this._debugMode.set(value);
  }

  // === Debug Helpers ===

  updateDebugStep(file: ProcessedFile, stepIndex: number, changes: Partial<import('../models/processed-file.model').DebugStep>): void {
    // Look up the fresh file instance from the store
    const currentFile = this._files().find(f => f.originalName === file.originalName);

    // If not found or debug not enabled, abort
    if (!currentFile || !currentFile.debugData) return;

    // Create a deep copy of the steps array
    const newSteps = currentFile.debugData.steps.map((step, index) =>
        index === stepIndex ? { ...step, ...changes } : step
    );

    this.updateFile(currentFile, {
        debugData: {
            ...currentFile.debugData,
            steps: newSteps,
            currentStepIndex: changes.status === 'success' || changes.status === 'failed' ? stepIndex + 1 : currentFile.debugData.currentStepIndex
        }
    });
  }

  // === Editor Methods ===

  /**
   * Opens the tag editor for a specific file.
   */
  openEditor(item: ProcessedFile): void {
    this._editingItem.set(item);

    const overrides = item.tagOverrides || {};
    const track = item.selectedTrack;
    const rel = item.releaseDetails || item.selectedRelease;

    console.log('[FilesStore] Opening editor for:', item.originalName);

    // Helper: use override if key exists (even if undefined), otherwise use fallback
    const getVal = <T>(key: keyof Mp3Tags, ...fallbacks: (T | undefined)[]): T | undefined => {
      if (key in overrides) return overrides[key] as T | undefined;
      for (const fb of fallbacks) {
        if (fb !== undefined && fb !== null && fb !== '') return fb;
      }
      return undefined;
    };

    // Build genre from Discogs (prefer styles over genres)
    let discogsGenre: string | string[] | undefined;
    if (rel?.styles && rel.styles.length > 0) {
      discogsGenre = rel.styles;
    } else if (rel?.genres && rel.genres.length > 0) {
      discogsGenre = rel.genres;
    }

    // Parse track number from position
    let defaultTrackNum: number | undefined = item.currentTags?.trackNumber;
    if (!defaultTrackNum && track?.position) {
      const num = parseInt(track.position.replace(/\D+/g, ''));
      if (!isNaN(num) && num > 0) defaultTrackNum = num;
    }

    this._editForm.set({
      artist: getVal('artist', track?.artists?.[0]?.name, rel?.artist, item.manualArtist),
      title: getVal('title', track?.title, item.manualTitle),
      album: getVal('album', rel?.title, item.currentTags?.album),
      bpm: getVal('bpm', item.currentTags?.bpm),
      genre: getVal('genre', discogsGenre, item.currentTags?.genre),
      year: getVal('year', rel?.year ? parseInt(String(rel.year)) : undefined, item.currentTags?.year),
      label: getVal('label', rel?.labels?.[0]?.name, item.currentTags?.label),
      albumArtist: getVal('albumArtist', rel?.artist, item.currentTags?.albumArtist),
      trackNumber: getVal('trackNumber', defaultTrackNum),
      discNumber: getVal('discNumber', item.currentTags?.discNumber),
      composer: getVal('composer', item.currentTags?.composer),
      comment: getVal('comment', item.currentTags?.comment)
    });
  }

  /**
   * Saves tag changes from the editor.
   */
  saveEditorTags(newTags: Mp3Tags): ProcessedFile | null {
    const item = this._editingItem();
    if (!item) return null;

    console.log('[FilesStore] Saving tags:', newTags);

    // Replace tagOverrides entirely with the new values
    this.updateFile(item, {
      tagOverrides: { ...newTags },
      manualArtist: newTags.artist || item.manualArtist,
      manualTitle: newTags.title || item.manualTitle,
      statusMessage: 'Tags saved.'
    });

    this._editingItem.set(null);
    return item;
  }

  /**
   * Closes the tag editor without saving.
   */
  closeEditor(): void {
    this._editingItem.set(null);
  }

  // === Bulk Selection Helpers ===

  /**
   * Gets files that are ready for download (have selected track and release).
   */
  getDownloadableFiles(): ProcessedFile[] {
    return this.filteredFiles().filter(f => f.selectedTrack && f.selectedRelease);
  }

  /**
   * Gets files that need BPM analysis.
   */
  getFilesNeedingBpm(): ProcessedFile[] {
    return this.filteredFiles().filter(f => !f.tagOverrides?.bpm && !f.currentTags?.bpm);
  }

  /**
   * Gets files that are pending or ready for search.
   */
  getSearchableFiles(): ProcessedFile[] {
    return this.filteredFiles().filter(f => f.status === 'pending' || f.status === 'ready');
  }
}
