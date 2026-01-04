/**
 * Unified SearchStrategy interface for all search modules.
 * Used by: CorrectionModule, DiscogsModule
 */
export interface SearchStrategy {
  /**
   * Type of search to perform:
   * - 'release': Search by artist + release title
   * - 'track': Search by artist + track title
   * - 'query': General text query search
   * - 'exact': Exact match search (artist - title)
   * - 'split_artist': When artist field contains "Artist - Title"
   * - 'title_only': Search by title without artist
   * - 'fuzzy': Fuzzy variant search
   */
  type:
    | 'release'
    | 'track'
    | 'query'
    | 'exact'
    | 'split_artist'
    | 'title_only'
    | 'fuzzy'
    | 'swap';

  /** Artist name for the search */
  artist?: string;

  /** Title for the search */
  title?: string;

  /** Raw query string (for 'query' type) */
  query?: string;

  /**
   * Type of Discogs search:
   * - 'master': Search master releases only
   * - 'release': Search individual releases
   * - 'all': Search both
   */
  searchType?: 'master' | 'release' | 'all';

  /** Human-readable description of this strategy */
  description: string;

  /** Priority order (lower = higher priority) */
  priority: number;

  /** Data source for this strategy */
  source?: 'discogs' | 'musicbrainz';

  /** Additional parameters for specific search types */
  params?: Record<string, unknown>;
}

/**
 * Result from a search operation with score.
 */
export interface ScoredSearchResult {
  id: string | number;
  title: string;
  artist?: string;
  year?: number;
  score: number;
  source: 'discogs' | 'musicbrainz';
  cover_image?: string;
  thumb?: string;
  label?: string;
  type?: string;
  genres?: string[];
  styles?: string[];
  tracklist?: TracklistItem[];
  matchDetails?: Record<string, unknown>;
}

/**
 * Item in a release tracklist.
 */
export interface TracklistItem {
  position: string;
  title: string;
  duration?: string;
  extraartists?: Array<{ name: string; role: string }>;
}
