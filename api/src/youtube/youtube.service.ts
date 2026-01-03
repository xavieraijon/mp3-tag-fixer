import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

const execAsync = promisify(exec);

export interface YoutubeVideoInfo {
  title: string;
  channel: string;
  duration: number;
  thumbnail: string;
}

interface YtDlpJsonOutput {
  title?: string;
  channel?: string;
  uploader?: string;
  duration?: number;
  thumbnail?: string;
}

export interface YoutubeDownloadResult {
  buffer: Buffer;
  filename: string;
  info: YoutubeVideoInfo;
}

@Injectable()
export class YoutubeService {
  private readonly logger = new Logger(YoutubeService.name);

  /**
   * Validates if the URL is a valid YouTube URL
   */
  isValidYoutubeUrl(url: string): boolean {
    const patterns = [
      /^(https?:\/\/)?(www\.)?youtube\.com\/watch\?v=[\w-]+/,
      /^(https?:\/\/)?(www\.)?youtu\.be\/[\w-]+/,
      /^(https?:\/\/)?(www\.)?youtube\.com\/shorts\/[\w-]+/,
    ];
    return patterns.some((pattern) => pattern.test(url));
  }

  /**
   * Extracts video ID from various YouTube URL formats
   */
  extractVideoId(url: string): string | null {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/)([\w-]+)/,
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) {
        return match[1];
      }
    }
    return null;
  }

  /**
   * Gets video information without downloading
   */
  async getVideoInfo(url: string): Promise<YoutubeVideoInfo> {
    if (!this.isValidYoutubeUrl(url)) {
      throw new BadRequestException('Invalid YouTube URL');
    }

    try {
      const { stdout } = await execAsync(
        `yt-dlp --dump-json --no-download "${url}"`,
        { maxBuffer: 10 * 1024 * 1024 },
      );

      const info = JSON.parse(stdout) as YtDlpJsonOutput;

      return {
        title: info.title || 'Unknown Title',
        channel: info.channel || info.uploader || 'Unknown Artist',
        duration: info.duration || 0,
        thumbnail: info.thumbnail || '',
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `[YoutubeService] Failed to get video info: ${message}`,
      );
      throw new BadRequestException(
        'Failed to get video information. The video may be private, unavailable, or the URL is invalid.',
      );
    }
  }

  /**
   * Downloads audio from YouTube and converts to MP3
   */
  async downloadAudio(url: string): Promise<YoutubeDownloadResult> {
    if (!this.isValidYoutubeUrl(url)) {
      throw new BadRequestException('Invalid YouTube URL');
    }

    // Create temp directory for download
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'yt-download-'));
    const outputTemplate = path.join(tempDir, '%(title)s.%(ext)s');

    try {
      // Get video info first
      const info = await this.getVideoInfo(url);
      this.logger.log(
        `[YoutubeService] Downloading: ${info.title} by ${info.channel}`,
      );

      // Download audio as MP3 using yt-dlp
      // -x: extract audio only
      // --audio-format mp3: convert to MP3
      // --audio-quality 0: best quality
      const command = `yt-dlp -x --audio-format mp3 --audio-quality 0 -o "${outputTemplate}" "${url}"`;

      await execAsync(command, {
        maxBuffer: 50 * 1024 * 1024, // 50MB buffer for large files
        timeout: 5 * 60 * 1000, // 5 minute timeout
      });

      // Find the downloaded file
      const files = await fs.readdir(tempDir);
      const mp3File = files.find((f) => f.endsWith('.mp3'));

      if (!mp3File) {
        throw new Error('MP3 file not found after download');
      }

      const filePath = path.join(tempDir, mp3File);
      const buffer = await fs.readFile(filePath);

      // Generate clean filename (only video title)
      const sanitizedTitle = this.sanitizeFilename(info.title);
      const filename = `${sanitizedTitle}.mp3`;

      this.logger.log(
        `[YoutubeService] Download complete: ${filename} (${buffer.length} bytes)`,
      );

      return {
        buffer,
        filename,
        info,
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`[YoutubeService] Download failed: ${message}`);

      if (message.includes('Video unavailable')) {
        throw new BadRequestException('Video is unavailable or private');
      }
      if (message.includes('Sign in')) {
        throw new BadRequestException(
          'Video requires authentication (age-restricted or private)',
        );
      }

      throw new BadRequestException(`Failed to download audio: ${message}`);
    } finally {
      // Cleanup temp directory
      try {
        await fs.rm(tempDir, { recursive: true, force: true });
      } catch {
        // Ignore cleanup errors
      }
    }
  }

  /**
   * Sanitizes a string for use as a filename
   */
  private sanitizeFilename(name: string): string {
    return name
      .replace(/[<>:"/\\|?*]/g, '') // Remove invalid chars
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim()
      .substring(0, 100); // Limit length
  }
}
