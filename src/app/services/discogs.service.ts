import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { lastValueFrom } from 'rxjs';
import { map } from 'rxjs/operators';
import { DiscogsRelease } from '../models/discogs.model';

export interface DiscogsDetail extends DiscogsRelease {
  main_release?: number;
}

interface ApiResponse<T> {
  results: T[];
  count: number;
}

/**
 * Service for interacting with Discogs via our backend API.
 * All API keys and rate limiting are handled server-side.
 */
@Injectable({
  providedIn: 'root'
})
export class DiscogsService {
  private readonly API_URL = '/api/discogs';

  constructor(private readonly http: HttpClient) {}

  /**
   * Search by artist and release title
   */
  async searchRelease(
    artist: string,
    release: string,
    type: 'release' | 'master' | 'all' = 'master'
  ): Promise<DiscogsRelease[]> {
    if (!artist && !release) return [];

    const params: any = {};
    if (artist) params.artist = artist;
    if (release) params.release = release;
    if (type !== 'all') params.type = type;

    const obs = this.http.get<ApiResponse<DiscogsRelease>>(
      `${this.API_URL}/search/release`,
      { params }
    ).pipe(map(res => res.results));

    return lastValueFrom(obs);
  }

  /**
   * Search by track name
   */
  async searchByTrack(
    artist: string,
    track: string,
    type: 'release' | 'master' | 'all' = 'all'
  ): Promise<DiscogsRelease[]> {
    if (!track) return [];

    const params: any = { track };
    if (artist) params.artist = artist;
    if (type !== 'all') params.type = type;

    const obs = this.http.get<ApiResponse<DiscogsRelease>>(
      `${this.API_URL}/search/track`,
      { params }
    ).pipe(map(res => res.results));

    return lastValueFrom(obs);
  }

  /**
   * General query search
   */
  async searchQuery(
    query: string,
    type: 'release' | 'master' | 'all' = 'all'
  ): Promise<DiscogsRelease[]> {
    if (!query || query.trim().length < 2) return [];

    const params: any = { q: query.trim() };
    if (type !== 'all') params.type = type;

    const obs = this.http.get<ApiResponse<DiscogsRelease>>(
      `${this.API_URL}/search`,
      { params }
    ).pipe(map(res => res.results));

    return lastValueFrom(obs);
  }

  /**
   * Get release or master details
   */
  async getReleaseDetails(
    id: number,
    type: 'release' | 'master' = 'release'
  ): Promise<DiscogsDetail> {
    const endpoint = type === 'master'
      ? `${this.API_URL}/master/${id}`
      : `${this.API_URL}/release/${id}`;

    const obs = this.http.get<DiscogsDetail>(endpoint);
    return lastValueFrom(obs);
  }

  /**
   * Fetch cover image as Blob via backend proxy (bypasses CORS)
   */
  async fetchCoverImage(imageUrl: string): Promise<Blob | null> {
    if (!imageUrl) return null;

    try {
      // Use backend proxy for Discogs images
      const proxyUrl = `${this.API_URL}/image?url=${encodeURIComponent(imageUrl)}`;
      const obs = this.http.get(proxyUrl, { responseType: 'blob' });
      return await lastValueFrom(obs);
    } catch (e) {
      console.warn('[DiscogsService] Could not fetch cover image:', e);
      return null;
    }
  }
}
