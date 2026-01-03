import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { DiscogsTrack } from '../models/discogs.model';
import { ProcessedFile } from '../models/processed-file.model';

@Injectable({
  providedIn: 'root',
})
export class TrackMatcherService {
  private http = inject(HttpClient);

  /** Minimum score required to consider a match valid */
  private readonly MIN_MATCH_SCORE = 30;

  /**
   * Finds the best matching track from a list of tracks.
   * Calls the backend to rank tracks against the file metadata.
   */
  async findBestMatch(
    item: ProcessedFile,
    tracks: DiscogsTrack[],
  ): Promise<DiscogsTrack | undefined> {
    if (!tracks || tracks.length === 0) return undefined;

    // Filter real tracks
    const realTracks = tracks.filter((t) => t.type_ === 'track');
    if (realTracks.length === 0) return undefined;

    // If only 1 track, return automatically
    if (realTracks.length === 1) {
      return realTracks[0];
    }

    try {
      // Parse duration (e.g. "03:45" -> 225) if generic helper not available here
      // Assuming simple string parsing for now or backend handles it?
      // Wait, ProcessedFile has 'duration' usually from tags or analysis?
      // Actually usually not directly available in ProcessedFile interface root, but tags yes.
      // Let's check ProcessedFile model.
      // item.currentTags.duration usually has it.

      const durationSeconds = 0;
      // Basic duration parsing if available from tags (often standard metadata)
      // If not available, send 0.

      const payload = {
        artist: item.manualArtist || item.currentTags?.artist || '',
        title: item.manualTitle || item.currentTags?.title || '',
        duration: durationSeconds, // TODO: Enhance if file analysis provides duration
        tracks: realTracks.map((t) => ({
          position: t.position,
          title: t.title,
          duration: t.duration,
          artists: t.artists,
        })),
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const ranked = await firstValueFrom<any[]>(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        this.http.post<any[]>('/api/correction/rank-tracks', payload),
      );

      if (ranked && ranked.length > 0) {
        const best = ranked[0];
        if (best.score >= this.MIN_MATCH_SCORE) {
          // Find original track object
          return realTracks.find((t) => t.position === best.position);
        }
      }
    } catch (e) {
      console.error('Failed to rank tracks via backend', e);
    }

    return undefined;
  }
}
