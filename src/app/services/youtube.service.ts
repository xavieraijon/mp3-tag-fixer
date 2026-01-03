import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { lastValueFrom } from 'rxjs';

export interface YoutubeDownloadResponse {
  fileId: string;
  originalName: string;
  size: number;
  parsedFilename: {
    artist: string;
    title: string;
  };
  currentTags: {
    title?: string;
    artist?: string;
    album?: string;
    year?: number;
    genre?: string | string[];
    duration?: number;
  };
  youtubeInfo?: {
    title: string;
    channel: string;
    duration: number;
    thumbnail: string;
  };
}

@Injectable({
  providedIn: 'root',
})
export class YoutubeService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = '/api/youtube';

  /**
   * Downloads audio from a YouTube URL
   * Returns file info in same format as file upload
   */
  async download(url: string): Promise<YoutubeDownloadResponse> {
    return lastValueFrom(
      this.http.post<YoutubeDownloadResponse>(`${this.apiUrl}/download`, { url }),
    );
  }

  /**
   * Validates if a string is a valid YouTube URL
   */
  isValidUrl(url: string): boolean {
    const patterns = [
      /^(https?:\/\/)?(www\.)?youtube\.com\/watch\?v=[\w-]+/,
      /^(https?:\/\/)?(www\.)?youtu\.be\/[\w-]+/,
      /^(https?:\/\/)?(www\.)?youtube\.com\/shorts\/[\w-]+/,
    ];
    return patterns.some((pattern) => pattern.test(url));
  }

  /**
   * Writes tags to a YouTube file and returns the blob for download
   */
  async writeTags(
    fileId: string,
    tags: {
      title?: string;
      artist?: string;
      album?: string;
      year?: number;
      genre?: string;
      trackNumber?: number;
      bpm?: number;
      label?: string;
      albumArtist?: string;
      composer?: string;
      comment?: string;
      coverImageUrl?: string;
    },
  ): Promise<Blob> {
    return lastValueFrom(
      this.http.post(`${this.apiUrl}/${fileId}/write-tags`, tags, {
        responseType: 'blob',
      }),
    );
  }
}
