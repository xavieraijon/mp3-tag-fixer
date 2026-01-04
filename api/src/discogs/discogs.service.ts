import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface DiscogsRelease {
  id: number;
  title: string;
  type?: 'release' | 'master';
  year?: number;
  thumb?: string;
  cover_image?: string;
  country?: string;
  format?: string[];
  labels?: { name: string }[];
  genres?: string[];
  styles?: string[];
  artist?: string;
  artists?: { name: string; join?: string }[];
  tracklist?: DiscogsTrack[];
  main_release?: number;
}

export interface DiscogsTrack {
  position: string;
  title: string;
  duration?: string;
  artists?: { name: string; join?: string }[];
  type_: string;
}

interface DiscogsRawResult {
  id: number;
  title: string;
  type?: 'release' | 'master';
  year?: number;
  thumb?: string;
  cover_image?: string;
  country?: string;
  format?: string[];
  label?: string[];
  genre?: string[];
  style?: string[];
}

interface DiscogsRawDetail {
  id: number;
  title: string;
  year?: number;
  artists?: { name: string; join?: string }[];
  labels?: { name: string }[];
  genres?: string[];
  styles?: string[];
  country?: string;
  thumb?: string;
  images?: { uri: string }[];
  tracklist?: {
    position: string;
    title: string;
    duration?: string;
    artists?: { name: string; join?: string }[];
    type_: string;
  }[];
  main_release?: number;
}

@Injectable()
export class DiscogsService {
  private readonly API_URL = 'https://api.discogs.com';
  private readonly consumerKey: string;
  private readonly consumerSecret: string;

  constructor(private readonly configService: ConfigService) {
    this.consumerKey =
      this.configService.get<string>('DISCOGS_CONSUMER_KEY') || '';
    this.consumerSecret =
      this.configService.get<string>('DISCOGS_CONSUMER_SECRET') || '';

    if (!this.consumerKey || !this.consumerSecret) {
      console.warn('[DiscogsService] API credentials not configured');
    }
  }

  private getHeaders(): Record<string, string> {
    return {
      Authorization: `Discogs key=${this.consumerKey}, secret=${this.consumerSecret}`,
      'User-Agent': 'MP3TagFixer/1.0',
    };
  }

  private parseSearchResult(r: DiscogsRawResult): DiscogsRelease {
    return {
      id: r.id,
      title: r.title.includes(' - ')
        ? r.title.split(' - ').slice(1).join(' - ')
        : r.title,
      type: r.type,
      year: r.year,
      thumb: r.thumb,
      cover_image: r.cover_image,
      country: r.country,
      format: r.format,
      labels: r.label ? r.label.map((l: string) => ({ name: l })) : [],
      genres: r.genre || [],
      styles: r.style || [],
      artist: r.title.includes(' - ') ? r.title.split(' - ')[0] : '',
    };
  }

  /**
   * Search by artist and release title
   */
  async searchRelease(
    artist: string,
    release: string,
    type: 'release' | 'master' | 'all' = 'master',
  ): Promise<DiscogsRelease[]> {
    const params = new URLSearchParams({ per_page: '25' });

    if (artist) params.set('artist', artist);
    if (release) params.set('release_title', release);
    if (type !== 'all') params.set('type', type);

    if (!artist && !release) return [];

    const url = `${this.API_URL}/database/search?${params}`;
    const response = await fetch(url, { headers: this.getHeaders() });

    if (!response.ok) {
      console.error('[DiscogsService] Search failed:', response.status);
      return [];
    }

    const data = (await response.json()) as { results: DiscogsRawResult[] };
    return (data.results || []).map((r) => this.parseSearchResult(r));
  }

  /**
   * Search by track name
   */
  async searchByTrack(
    artist: string,
    track: string,
    type: 'release' | 'master' | 'all' = 'all',
  ): Promise<DiscogsRelease[]> {
    const params = new URLSearchParams({ per_page: '25' });

    if (artist) params.set('artist', artist);
    if (track) params.set('track', track);
    if (type !== 'all') params.set('type', type);

    if (!track) return [];

    const url = `${this.API_URL}/database/search?${params}`;
    const response = await fetch(url, { headers: this.getHeaders() });

    if (!response.ok) return [];

    const data = (await response.json()) as { results: DiscogsRawResult[] };
    return (data.results || []).map((r) => this.parseSearchResult(r));
  }

  /**
   * General query search
   */
  async searchQuery(
    query: string,
    type: 'release' | 'master' | 'all' = 'all',
  ): Promise<DiscogsRelease[]> {
    if (!query || query.trim().length < 2) return [];

    const params = new URLSearchParams({
      q: query.trim(),
      per_page: '25',
    });
    if (type !== 'all') params.set('type', type);

    const url = `${this.API_URL}/database/search?${params}`;
    const response = await fetch(url, { headers: this.getHeaders() });

    if (!response.ok) return [];

    const data = (await response.json()) as { results: DiscogsRawResult[] };
    return (data.results || []).map((r) => this.parseSearchResult(r));
  }

  /**
   * Get release or master details
   */
  async getReleaseDetails(
    id: number,
    type: 'release' | 'master' = 'release',
  ): Promise<DiscogsRelease | null> {
    const url =
      type === 'master'
        ? `${this.API_URL}/masters/${id}`
        : `${this.API_URL}/releases/${id}`;

    const response = await fetch(url, { headers: this.getHeaders() });

    if (!response.ok) {
      console.warn(
        `[DiscogsService] Get details failed for ${type}/${id} (${response.status}). Trying fallback...`,
      );

      // If master failed, try release, and vice versa
      if (response.status === 404 || response.status === 400) {
        const fallbackType = type === 'master' ? 'release' : 'master';
        const fallbackUrl =
          fallbackType === 'master'
            ? `${this.API_URL}/masters/${id}`
            : `${this.API_URL}/releases/${id}`;

        const fallbackResponse = await fetch(fallbackUrl, {
          headers: this.getHeaders(),
        });
        if (fallbackResponse.ok) {
          console.log(
            `[DiscogsService] Fallback successful: Found as ${fallbackType}`,
          );
          const details = (await fallbackResponse.json()) as DiscogsRawDetail;
          return this.mapToDiscogsRelease(details); // Refactored mapping to shared method
        }
      }

      return null;
    }

    const details = (await response.json()) as DiscogsRawDetail;
    return this.mapToDiscogsRelease(details);
  }

  private mapToDiscogsRelease(details: DiscogsRawDetail): DiscogsRelease {
    return {
      id: details.id,
      title: details.title,
      year: details.year,
      artist: this.formatArtistName(details.artists),
      artists: details.artists?.map((a) => ({ name: a.name, join: a.join })),
      labels: details.labels?.map((l) => ({ name: l.name })) || [],
      genres: details.genres || [],
      styles: details.styles || [],
      country: details.country,
      thumb: details.thumb,
      cover_image: details.images?.[0]?.uri || details.thumb,
      tracklist: details.tracklist?.map((t) => ({
        position: t.position,
        title: t.title,
        duration: t.duration,
        artists: t.artists?.map((a) => ({ name: a.name, join: a.join })),
        type_: t.type_,
      })),
      main_release: details.main_release,
    };
  }

  private formatArtistName(
    artists: { name: string; join?: string }[] | undefined,
  ): string {
    if (!artists || artists.length === 0) return '';
    return artists
      .map((a, index) => {
        // Clean "Name (2)" -> "Name"
        const cleanName = a.name.replace(/\s*\(\d+\)$/, '');

        let suffix = '';
        if (index < artists.length - 1) {
          const j = a.join ? a.join.trim() : '/';
          if (j === ',') {
            suffix = ', ';
          } else {
            suffix = ` ${j} `;
          }
        }
        return cleanName + suffix;
      })
      .join('')
      .trim();
  }

  /**
   * Fetch cover image (proxy to bypass CORS)
   */
  async fetchCoverImage(imageUrl: string): Promise<Buffer | null> {
    if (!imageUrl) return null;

    try {
      const response = await fetch(imageUrl, {
        headers: { 'User-Agent': 'MP3TagFixer/1.0' },
      });

      if (!response.ok) return null;

      const arrayBuffer = await response.arrayBuffer();
      return Buffer.from(arrayBuffer);
    } catch (e) {
      console.warn('[DiscogsService] Could not fetch cover:', e);
      return null;
    }
  }
}
