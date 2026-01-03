import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import { DiscogsRelease } from '../models/discogs.model';

export interface SearchResult extends DiscogsRelease {
  _score?: number;
}

@Injectable({
  providedIn: 'root',
})
export class SearchService {
  private readonly http = inject(HttpClient);

  /**
   * Search for matches using the intelligent backend backend correction module.
   */
  async search(
    artist: string,
    title: string,
    onProgress?: (message: string) => void,
    aiConfidence?: number,
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
          aiConfidence,
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
