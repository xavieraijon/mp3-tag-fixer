import { Mp3Tags } from './mp3-tags.model';
import { DiscogsRelease, DiscogsTrack } from './discogs.model';

export interface DebugStep {
  name: 'AcoustID' | 'Groq AI' | 'Traditional';
  status: 'pending' | 'running' | 'success' | 'failed' | 'skipped';
  result?: { artist: string; title: string; confidence?: number };
  durationMs?: number;
  logs?: string[];
}

export interface DebugData {
  enabled: boolean;
  steps: DebugStep[];
  currentStepIndex: number;
}

export interface ProcessedFile {
  file: File;
  originalName: string;
  currentTags: Mp3Tags;
  status: 'pending' | 'searching' | 'loading_details' | 'ready' | 'done' | 'error';
  statusMessage?: string; // User facing message
  searchResults: DiscogsRelease[];
  selectedRelease?: DiscogsRelease;
  releaseDetails?: DiscogsRelease; // Full details with tracklist
  tracks: DiscogsTrack[];
  selectedTrack?: DiscogsTrack;

  // Debug Mode Data
  debugData?: DebugData;
  debugInfo?: string;

  // Cover image from Discogs
  coverImageUrl?: string;

  // Manual overrides or search inputs
  manualArtist: string;
  manualTitle: string;

  // Final tags to apply (if edited manually)
  tagOverrides?: Mp3Tags;

  // State flags
  isAnalyzingBpm?: boolean;
}
