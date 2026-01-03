import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import fpcalc from 'fpcalc';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

export interface AcoustidRecording {
  id: string;
  title: string;
  artists: { id: string; name: string }[];
  releasegroups?: { id: string; title: string; type?: string }[];
}

export interface AcoustidResult {
  id: string;
  score: number;
  recordings: AcoustidRecording[];
}

export interface IdentifyResult {
  source: 'acoustid';
  confidence: number;
  artist: string;
  title: string;
  album?: string;
  musicbrainzId?: string;
  acoustidId?: string;
}

@Injectable()
export class AcoustidService {
  private readonly logger = new Logger(AcoustidService.name);
  private readonly apiKey: string | undefined;
  private readonly apiUrl = 'https://api.acoustid.org/v2/lookup';

  constructor(private configService: ConfigService) {
    this.apiKey = this.configService.get<string>('ACOUSTID_API_KEY');

    if (this.apiKey) {
      this.logger.log('AcoustID service initialized');
    } else {
      this.logger.warn(
        'ACOUSTID_API_KEY not configured - audio fingerprinting disabled',
      );
    }
  }

  isAvailable(): boolean {
    return !!this.apiKey;
  }

  /**
   * Generate chromaprint fingerprint from audio file
   */
  async generateFingerprint(
    filePath: string,
  ): Promise<{ fingerprint: string; duration: number }> {
    return new Promise((resolve, reject) => {
      fpcalc(
        filePath,
        (
          err: Error | null,
          result: { fingerprint: string; duration: number },
        ) => {
          if (err) {
            this.logger.error(`Fingerprint generation failed: ${err.message}`);
            reject(err);
            return;
          }
          this.logger.debug(
            `Generated fingerprint for ${path.basename(filePath)}, duration: ${result.duration}s`,
          );
          resolve(result);
        },
      );
    });
  }

  /**
   * Look up fingerprint in AcoustID database
   */
  async lookup(
    fingerprint: string,
    duration: number,
  ): Promise<AcoustidResult[]> {
    if (!this.apiKey) {
      throw new Error('AcoustID API key not configured');
    }

    const params = new URLSearchParams({
      client: this.apiKey,
      fingerprint: fingerprint,
      duration: Math.round(duration).toString(),
      meta: 'recordings+releasegroups+compress',
    });

    const url = `${this.apiUrl}?${params.toString()}`;

    try {
      const response = await fetch(url);
      const data = await response.json();

      if (data.status !== 'ok') {
        this.logger.error(`AcoustID API error: ${JSON.stringify(data)}`);
        throw new Error(
          `AcoustID API error: ${data.error?.message || 'Unknown error'}`,
        );
      }

      return data.results || [];
    } catch (error) {
      this.logger.error(`AcoustID lookup failed: ${error}`);
      throw error;
    }
  }

  /**
   * Identify track from audio buffer
   * Saves buffer to temp file, generates fingerprint, looks up in AcoustID
   */
  async identifyFromBuffer(buffer: Buffer): Promise<IdentifyResult | null> {
    if (!this.apiKey) {
      this.logger.warn('AcoustID not available, skipping identification');
      return null;
    }

    // Create temp file
    const tempDir = os.tmpdir();
    const tempFile = path.join(tempDir, `acoustid-${Date.now()}.mp3`);

    try {
      // Write buffer to temp file
      await fs.writeFile(tempFile, buffer);
      this.logger.debug(`Saved temp file: ${tempFile}`);

      // Generate fingerprint
      const { fingerprint, duration } =
        await this.generateFingerprint(tempFile);

      // Look up in AcoustID
      const results = await this.lookup(fingerprint, duration);

      if (results.length === 0) {
        this.logger.debug('No AcoustID matches found');
        return null;
      }

      // Get best result
      const bestResult = results[0];

      if (!bestResult.recordings || bestResult.recordings.length === 0) {
        this.logger.debug('AcoustID match has no recordings');
        return null;
      }

      // Get first recording with artist info
      const recording = bestResult.recordings.find(
        (r) => r.artists && r.artists.length > 0,
      );

      if (!recording) {
        this.logger.debug('No recording with artist info found');
        return null;
      }

      const artist = recording.artists.map((a) => a.name).join(', ');
      const album = recording.releasegroups?.[0]?.title;

      this.logger.log(
        `AcoustID identified: "${artist} - ${recording.title}" (score: ${bestResult.score})`,
      );

      return {
        source: 'acoustid',
        confidence: bestResult.score,
        artist: artist,
        title: recording.title,
        album: album,
        musicbrainzId: recording.id,
        acoustidId: bestResult.id,
      };
    } catch (error) {
      this.logger.error(`Identification failed: ${error}`);
      return null;
    } finally {
      // Clean up temp file
      try {
        await fs.unlink(tempFile);
      } catch {
        // Ignore cleanup errors
      }
    }
  }

  /**
   * Identify track from file path
   */
  async identifyFromFile(filePath: string): Promise<IdentifyResult | null> {
    if (!this.apiKey) {
      this.logger.warn('AcoustID not available, skipping identification');
      return null;
    }

    try {
      // Generate fingerprint directly from file
      const { fingerprint, duration } =
        await this.generateFingerprint(filePath);

      // Look up in AcoustID
      const results = await this.lookup(fingerprint, duration);

      if (results.length === 0) {
        this.logger.debug('No AcoustID matches found');
        return null;
      }

      // Get best result
      const bestResult = results[0];

      if (!bestResult.recordings || bestResult.recordings.length === 0) {
        this.logger.debug('AcoustID match has no recordings');
        return null;
      }

      // Get first recording with artist info
      const recording = bestResult.recordings.find(
        (r) => r.artists && r.artists.length > 0,
      );

      if (!recording) {
        this.logger.debug('No recording with artist info found');
        return null;
      }

      const artist = recording.artists.map((a) => a.name).join(', ');
      const album = recording.releasegroups?.[0]?.title;

      this.logger.log(
        `AcoustID identified: "${artist} - ${recording.title}" (score: ${bestResult.score})`,
      );

      return {
        source: 'acoustid',
        confidence: bestResult.score,
        artist: artist,
        title: recording.title,
        album: album,
        musicbrainzId: recording.id,
        acoustidId: bestResult.id,
      };
    } catch (error) {
      this.logger.error(`Identification failed: ${error}`);
      return null;
    }
  }
}
