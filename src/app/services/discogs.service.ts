import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, lastValueFrom } from 'rxjs';
import { map } from 'rxjs/operators';
import { DiscogsRelease, DiscogsTrack } from '../models/discogs.model';

// Helper interface for the details response which bundles everything
export interface DiscogsDetail extends DiscogsRelease {
    main_release?: number;
}

@Injectable({
  providedIn: 'root'
})
export class DiscogsService {
  private readonly API_URL = 'https://api.discogs.com';
  // Note: specific to this user session as provided
  private readonly CONSUMER_KEY = 'lNHHnrZAzHAGtyZPHWFO';
  private readonly CONSUMER_SECRET = 'ocerZjWFaQbMQsCIjIapmFJCdTIWdcin';

  constructor(private readonly http: HttpClient) {}

  private getHeaders(): HttpHeaders {
    return new HttpHeaders({
      'Authorization': `Discogs key=${this.CONSUMER_KEY}, secret=${this.CONSUMER_SECRET}`
    });
  }

  /**
   * Parse Discogs search result into our model
   */
  private parseSearchResult(r: any): DiscogsRelease {
    return {
      id: r.id,
      title: r.title.includes(' - ') ? r.title.split(' - ').slice(1).join(' - ') : r.title,
      type: r.type,
      year: r.year,
      thumb: r.thumb,
      cover_image: r.cover_image,
      country: r.country,
      format: r.format,
      labels: r.label ? r.label.map((l: string) => ({ name: l })) : [],
      genres: r.genre || [],
      styles: r.style || [],
      artist: r.title.includes(' - ') ? r.title.split(' - ')[0] : ''
    };
  }

  /**
   * Search by artist and release title
   */
  async searchRelease(artist: string, release: string, type: 'release' | 'master' | 'all' = 'master'): Promise<DiscogsRelease[]> {
    const params: any = { per_page: 25 };

    if (artist) params.artist = artist;
    if (release) params.release_title = release;
    if (type !== 'all') params.type = type;

    if (!artist && !release) return [];

    const obs = this.http.get<any>(`${this.API_URL}/database/search`, {
       headers: this.getHeaders(),
       params
    }).pipe(
        map(response => (response.results || []).map((r: any) => this.parseSearchResult(r)))
    );

    return lastValueFrom(obs);
  }

  /**
   * Search by track name (useful for finding compilations)
   */
  async searchByTrack(artist: string, track: string, type: 'release' | 'master' | 'all' = 'all'): Promise<DiscogsRelease[]> {
    const params: any = { per_page: 25 };

    if (artist) params.artist = artist;
    if (track) params.track = track;
    if (type !== 'all') params.type = type;

    if (!track) return [];

    const obs = this.http.get<any>(`${this.API_URL}/database/search`, {
       headers: this.getHeaders(),
       params
    }).pipe(
        map(response => (response.results || []).map((r: any) => this.parseSearchResult(r)))
    );

    return lastValueFrom(obs);
  }

  /**
   * General query search (searches across all fields)
   */
  async searchQuery(query: string, type: 'release' | 'master' | 'all' = 'all'): Promise<DiscogsRelease[]> {
    if (!query || query.trim().length < 2) return [];

    const params: any = {
      q: query.trim(),
      per_page: 25
    };
    if (type !== 'all') params.type = type;

    const obs = this.http.get<any>(`${this.API_URL}/database/search`, {
       headers: this.getHeaders(),
       params
    }).pipe(
        map(response => (response.results || []).map((r: any) => this.parseSearchResult(r)))
    );

    return lastValueFrom(obs);
  }

  async getReleaseDetails(id: number, type: 'release' | 'master' | 'all' = 'release'): Promise<DiscogsDetail> {
      let url = `${this.API_URL}/releases/${id}`;
      if (type === 'master') {
          url = `${this.API_URL}/masters/${id}`;
      }

      const obs = this.http.get<any>(url, {
          headers: this.getHeaders()
      }).pipe(
          map(details => {
              // Map fields if necessary, or return raw structure if it matches interface
              // Discogs API Details structure is slightly different for Master vs Release.
              // We return a unified structure with all relevant metadata.
              return {
                  id: details.id,
                  title: details.title,
                  year: details.year,
                  artist: details.artists?.[0]?.name,
                  artists: details.artists?.map((a: any) => ({ name: a.name })),
                  labels: details.labels?.map((l: any) => ({ name: l.name })) || [],
                  genres: details.genres || [],
                  styles: details.styles || [],
                  country: details.country,
                  thumb: details.thumb,
                  cover_image: details.images?.[0]?.uri || details.thumb,
                  tracklist: details.tracklist?.map((t: any) => ({
                      position: t.position,
                      title: t.title,
                      duration: t.duration,
                      artists: t.artists?.map((a: any) => ({ name: a.name })),
                      type_: t.type_
                  })),
                  main_release: details.main_release
              };
          })
      );
      return lastValueFrom(obs);
  }

  /**
   * Fetch cover image as Blob via proxy to bypass CORS
   * Discogs CDN (i.discogs.com) blocks cross-origin requests
   */
  async fetchCoverImage(imageUrl: string): Promise<Blob | null> {
      if (!imageUrl) return null;

      try {
          // Transform Discogs image URL to use local proxy
          // https://i.discogs.com/xxx → /discogs-images/xxx
          let proxyUrl = imageUrl;
          if (imageUrl.includes('i.discogs.com')) {
              proxyUrl = imageUrl.replace('https://i.discogs.com', '/discogs-images');
          }

          const obs = this.http.get(proxyUrl, {
              responseType: 'blob'
          });
          return await lastValueFrom(obs);
      } catch (e) {
          console.warn('Could not fetch cover image:', e);
          return null;
      }
  }
}
