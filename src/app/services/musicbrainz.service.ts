import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { DiscogsRelease } from '../models/discogs.model';

@Injectable({
  providedIn: 'root'
})
export class MusicBrainzService {
  private http = inject(HttpClient);
  private readonly API_URL = '/api/musicbrainz';

  searchReleases(artist: string, release: string): Promise<DiscogsRelease[]> {
    if (!artist && !release) return Promise.resolve([]);

    const params: Record<string, string> = {};
    if (artist) params['artist'] = artist;
    if (release) params['title'] = release;

    return this.http.get<DiscogsRelease[]>(`${this.API_URL}/search`, { params })
      .pipe(
        catchError(err => {
          console.error('[MusicBrainzService] Search failed', err);
          return of([]);
        })
      )
      .toPromise()
      .then(res => res || []);
  }

  getReleaseDetails(id: string): Promise<DiscogsRelease | null> {
    return this.http.get<DiscogsRelease>(`${this.API_URL}/release/${id}`)
      .pipe(
        catchError(err => {
          console.error('[MusicBrainzService] Get details failed', err);
          return of(null);
        })
      )
      .toPromise()
      .then(res => res || null);
  }
}
