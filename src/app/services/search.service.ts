import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import { DiscogsRelease } from '../models/discogs.model';

export interface SearchResult extends DiscogsRelease {
  _score?: number;
}

export interface SearchOptions {
  artist: string;
  title: string;
  filename?: string;
  duration?: number;
  aiConfidence?: number;
  onProgress?: (message: string) => void;
}

@Injectable({
  providedIn: 'root',
})
export class SearchService {
  private readonly http = inject(HttpClient);

  /**
   * Search for matches using the intelligent backend correction module.
   * Now sends filename and duration for better heuristic analysis.
   */
  async search(
    artist: string,
    title: string,
    onProgress?: (message: string) => void,
    aiConfidence?: number,
    filename?: string,
    duration?: number,
    useAiFallback?: boolean,
  ): Promise<SearchResult[]> {
    if (onProgress) {
      onProgress('Searching via Correction API...');
    }

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const results = await this.http
        .post<any[]>('/api/correction/search', {
          artist,
          title,
          filename, // Send filename for heuristic parsing
          duration, // Send duration for track matching
          aiConfidence,
          useAiFallback,
        })
        .toPromise();

      return (results || []).map((r) => ({
        ...r,
        _score: r.score, // Map backend score to frontend prop
        thumb: r.thumb || r.cover_image,
      }));
    } catch (e) {
      console.error('Search failed:', e);
      return [];
    }
  }
}
