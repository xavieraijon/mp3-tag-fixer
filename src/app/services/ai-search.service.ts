import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { lastValueFrom } from 'rxjs';

export interface AiParseResult {
  artist: string;
  title: string;
  confidence: number;
  source: 'groq' | 'fallback';
  reasoning?: string;
}

export interface AcoustidResult {
  source: 'acoustid';
  confidence: number;
  artist: string;
  title: string;
  album?: string;
  musicbrainzId?: string;
  acoustidId?: string;
  error?: string;
}

export interface AiStatus {
  available: boolean;
  provider: string;
}

/**
 * Service for AI-powered filename parsing and audio fingerprint identification.
 * Uses Groq LLM for filename parsing and AcoustID for audio fingerprinting.
 */
@Injectable({
  providedIn: 'root',
})
export class AiSearchService {
  private readonly http = inject(HttpClient);
  private readonly API_URL = '/api/ai';

  // Feature flag - can be toggled by user
  private readonly _enabled = signal<boolean>(false);
  readonly enabled = this._enabled.asReadonly();

  // Groq status cache
  private readonly _available = signal<boolean | null>(null);
  readonly available = this._available.asReadonly();

  // AcoustID status cache
  private readonly _acoustidAvailable = signal<boolean | null>(null);
  readonly acoustidAvailable = this._acoustidAvailable.asReadonly();

  /**
   * Toggle AI features on/off
   */
  setEnabled(value: boolean): void {
    this._enabled.set(value);
    console.log(`[AiSearchService] AI ${value ? 'enabled' : 'disabled'}`);
  }

  /**
   * Check if AI service is available on the backend
   */
  async checkStatus(): Promise<AiStatus> {
    try {
      const status = await lastValueFrom(this.http.get<AiStatus>(`${this.API_URL}/status`));
      this._available.set(status.available);
      return status;
    } catch (e) {
      console.warn('[AiSearchService] Failed to check AI status:', e);
      this._available.set(false);
      return { available: false, provider: 'none' };
    }
  }

  /**
   * Parse a filename using AI to extract artist and title.
   * Returns null if AI is disabled or unavailable.
   */
  async parseFilename(
    filename: string,
    existingArtist?: string,
    existingTitle?: string,
  ): Promise<AiParseResult | null> {
    // Check if AI is enabled
    if (!this._enabled()) {
      console.log('[AiSearchService] AI disabled, skipping');
      return null;
    }

    // Check availability if not yet known
    if (this._available() === null) {
      await this.checkStatus();
    }

    if (!this._available()) {
      console.log('[AiSearchService] AI not available on backend');
      return null;
    }

    try {
      console.log(`[AiSearchService] Parsing filename: "${filename}"`);

      const result = await lastValueFrom(
        this.http.post<AiParseResult>(`${this.API_URL}/parse-filename`, {
          filename,
          existingArtist,
          existingTitle,
        }),
      );

      console.log(
        `[AiSearchService] AI result: artist="${result.artist}", title="${result.title}", confidence=${result.confidence}`,
      );

      return result;
    } catch (e) {
      console.error('[AiSearchService] Failed to parse filename:', e);
      return null;
    }
  }

  /**
   * Determines if AI result should be used based on confidence threshold.
   */
  shouldUseAiResult(result: AiParseResult | null, threshold = 0.7): boolean {
    if (!result) return false;
    return result.confidence >= threshold;
  }

  // ============ AcoustID Methods ============

  /**
   * Check if AcoustID service is available on the backend
   */
  async checkAcoustidStatus(): Promise<AiStatus> {
    try {
      const status = await lastValueFrom(
        this.http.get<AiStatus>(`${this.API_URL}/acoustid/status`),
      );
      this._acoustidAvailable.set(status.available);
      return status;
    } catch (e) {
      console.warn('[AiSearchService] Failed to check AcoustID status:', e);
      this._acoustidAvailable.set(false);
      return { available: false, provider: 'acoustid' };
    }
  }

  /**
   * Identify a track by its audio fingerprint.
   * Uploads file directly to AcoustID endpoint (no auth required).
   */
  async identifyByFingerprint(file: File): Promise<AcoustidResult | null> {
    // Check if AI is enabled
    if (!this._enabled()) {
      console.log('[AiSearchService] AI disabled, skipping fingerprint identification');
      return null;
    }

    // Check AcoustID availability if not yet known
    if (this._acoustidAvailable() === null) {
      await this.checkAcoustidStatus();
    }

    if (!this._acoustidAvailable()) {
      console.log('[AiSearchService] AcoustID not available on backend');
      return null;
    }

    try {
      console.log(`[AiSearchService] Identifying by fingerprint: "${file.name}"`);

      // Upload file directly to AcoustID identify endpoint (no auth required)
      const formData = new FormData();
      formData.append('file', file);

      const result = await lastValueFrom(
        this.http.post<AcoustidResult | { error: string }>(`${this.API_URL}/identify`, formData),
      );

      if ('error' in result) {
        console.log(`[AiSearchService] AcoustID identification failed: ${result.error}`);
        return null;
      }

      console.log(
        `[AiSearchService] AcoustID result: "${result.artist} - ${result.title}" (confidence: ${result.confidence})`,
      );
      return result;
    } catch (e) {
      console.error('[AiSearchService] Failed to identify by fingerprint:', e);
      return null;
    }
  }

  /**
   * Determines if AcoustID result should be used based on confidence threshold.
   */
  shouldUseAcoustidResult(result: AcoustidResult | null, threshold = 0.8): boolean {
    if (!result) return false;
    return result.confidence >= threshold;
  }
}
