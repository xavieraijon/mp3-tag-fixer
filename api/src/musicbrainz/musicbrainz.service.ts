import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

// Define structures compatible with DiscogsRelease for unification
export interface UnifiedRelease {
  id: string | number;
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
  artists?: { name: string }[];
  tracklist?: any[];
  source: 'discogs' | 'musicbrainz';
}

interface MbArtistCredit {
  name: string;
}

interface MbLabelInfo {
  label?: { name: string };
}

interface MbTrack {
  number: string;
  title: string;
  length?: number;
  'artist-credit'?: MbArtistCredit[];
}

interface MbMedium {
  tracks?: MbTrack[];
}

interface MusicBrainzRawRelease {
  id: string;
  title: string;
  date?: string;
  country?: string;
  'label-info'?: MbLabelInfo[];
  'artist-credit'?: MbArtistCredit[];
  media?: MbMedium[];
}

@Injectable()
export class MusicBrainzService {
  private readonly API_URL = 'https://musicbrainz.org/ws/2';
  private readonly USER_AGENT = 'MP3TagFixer/1.0 ( your-email@example.com )'; // Replace with config if needed

  constructor(private readonly configService: ConfigService) {}

  private getHeaders(): Record<string, string> {
    return {
      'User-Agent': this.USER_AGENT,
      Accept: 'application/json',
    };
  }

  /**
   * Search releases by artist/title
   */
  async searchReleases(
    artist: string,
    title: string,
  ): Promise<UnifiedRelease[]> {
    const queryParts = [];
    if (artist) queryParts.push(`artist:${this.escapeQuery(artist)}`);
    if (title) queryParts.push(`release:${this.escapeQuery(title)}`);

    if (queryParts.length === 0) return [];

    const query = queryParts.join(' AND ');
    const url = `${this.API_URL}/release?query=${encodeURIComponent(query)}&fmt=json&limit=15`;

    try {
      const response = await fetch(url, { headers: this.getHeaders() });
      if (!response.ok) return [];

      const data = (await response.json()) as {
        releases: MusicBrainzRawRelease[];
      };
      return (data.releases || []).map((r) => this.mapToUnified(r));
    } catch (e) {
      console.error('[MusicBrainz] Search failed', e);
      return [];
    }
  }

  /**
   * Get release details by MBID
   */
  async getReleaseById(id: string): Promise<UnifiedRelease | null> {
    const url = `${this.API_URL}/release/${id}?inc=recordings+artist-credits+labels+release-groups+media&fmt=json`;

    try {
      const response = await fetch(url, { headers: this.getHeaders() });
      if (!response.ok) return null;

      const data = (await response.json()) as MusicBrainzRawRelease;
      return this.mapToUnified(data, true);
    } catch (e) {
      console.error('[MusicBrainz] Get details failed', e);
      return null;
    }
  }

  private mapToUnified(
    mbRelease: MusicBrainzRawRelease,
    detailed = false,
  ): UnifiedRelease {
    const artistCredit = mbRelease['artist-credit'] || [];
    const artistName = artistCredit.map((a) => a.name).join('') || 'Unknown';

    const release: UnifiedRelease = {
      id: mbRelease.id,
      title: mbRelease.title,
      type: 'release', // MB technically has release-groups which are like masters, but we search releases usually
      year: mbRelease.date
        ? parseInt(mbRelease.date.substring(0, 4))
        : undefined,
      country: mbRelease.country,
      labels: (mbRelease['label-info'] || []).map((l) => ({
        name: l.label?.name || '',
      })),
      artist: artistName,
      artists: artistCredit.map((a) => ({ name: a.name })),
      source: 'musicbrainz',
    };

    if (detailed && mbRelease.media) {
      release.tracklist = [];
      mbRelease.media.forEach((medium) => {
        const tracks = medium.tracks || [];
        tracks.forEach((t) => {
          release.tracklist!.push({
            position: t.number, // or medium position + track position
            title: t.title,
            duration: t.length ? this.formatDuration(t.length) : '',
            type_: 'track',
            artists: t['artist-credit']?.map((a) => ({ name: a.name })),
          });
        });
      });
    }

    return release;
  }

  private formatDuration(ms: number): string {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  private escapeQuery(str: string): string {
    // Lucene special characters escaping might be needed, but simple phrase is often enough.
    // Putting quotes works for exact phrases.
    return `"${str.replace(/"/g, '\\"')}"`;
  }
}
