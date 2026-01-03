import { Injectable, BadRequestException } from '@nestjs/common';
import { parseBuffer, IAudioMetadata } from 'music-metadata';
import * as NodeID3 from 'node-id3';
import * as fs from 'fs/promises';
import * as path from 'path';
import { FilenameParser } from '../correction/utils/filename-parser';

export interface Mp3Tags {
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
  duration?: number;
  image?: Buffer;
}

export interface ParsedFilename {
  artist: string;
  title: string;
}

@Injectable()
export class FilesService {
  private readonly uploadDir = path.join(process.cwd(), 'uploads');

  /**
   * Read ID3 tags from an MP3 buffer
   */
  async readTags(buffer: Buffer): Promise<Mp3Tags> {
    try {
      const metadata: IAudioMetadata = await parseBuffer(buffer, {
        mimeType: 'audio/mpeg',
      });

      const { common, format } = metadata;

      return {
        title: common.title,
        artist: common.artist,
        album: common.album,
        year: common.year,
        genre: common.genre?.[0],
        trackNumber: common.track?.no ?? undefined,
        bpm: common.bpm,
        label: common.label?.[0],
        albumArtist: common.albumartist,
        composer: common.composer?.[0],
        comment:
          typeof common.comment?.[0] === 'string'
            ? common.comment[0]
            : common.comment?.[0]?.text,
        duration: format.duration ? Math.round(format.duration) : undefined,
        image: common.picture?.[0]?.data
          ? Buffer.from(common.picture[0].data)
          : undefined,
      };
    } catch (error) {
      console.error('[FilesService] Error reading tags:', error);
      throw new BadRequestException('Failed to read MP3 tags');
    }
  }

  /**
   * Write ID3 tags to an MP3 buffer
   */
  writeTags(buffer: Buffer, tags: Mp3Tags): Promise<Buffer> {
    try {
      const id3Tags: NodeID3.Tags = {
        title: tags.title,
        artist: tags.artist,
        album: tags.album,
        year: tags.year?.toString(),
        genre: tags.genre,
        trackNumber: tags.trackNumber?.toString(),
        bpm: tags.bpm?.toString(),
        publisher: tags.label,
        performerInfo: tags.albumArtist,
        composer: tags.composer,
        comment: tags.comment
          ? { language: 'eng', text: tags.comment }
          : undefined,
      };

      // Add cover image if provided
      if (tags.image) {
        id3Tags.image = {
          mime: 'image/jpeg',
          type: { id: 3, name: 'front cover' },
          description: 'Cover',
          imageBuffer: tags.image,
        };
      }

      const taggedBuffer = NodeID3.write(id3Tags, buffer);

      if (!taggedBuffer) {
        throw new Error('Failed to write tags');
      }

      return Promise.resolve(taggedBuffer);
    } catch (error) {
      console.error('[FilesService] Error writing tags:', error);
      throw new BadRequestException('Failed to write MP3 tags');
    }
  }

  /**
   * Parse filename to extract artist and title
   */
  parseFilename(filename: string): ParsedFilename {
    return FilenameParser.parseFilename(filename);
  }

  /**
   * Save uploaded file temporarily
   */
  async saveTemp(file: Express.Multer.File): Promise<string> {
    const filename = `${Date.now()}-${file.originalname}`;
    const filepath = path.join(this.uploadDir, filename);

    await fs.mkdir(this.uploadDir, { recursive: true });
    await fs.writeFile(filepath, file.buffer);

    return filepath;
  }

  /**
   * Read file from disk
   */
  async readFile(filepath: string): Promise<Buffer> {
    return fs.readFile(filepath);
  }

  /**
   * Delete temporary file
   */
  async deleteTemp(filepath: string): Promise<void> {
    try {
      await fs.unlink(filepath);
    } catch {
      console.warn('[FilesService] Failed to delete temp file:', filepath);
    }
  }

  /**
   * Sanitize filename for download
   */
  sanitizeFilename(artist: string, title: string): string {
    const name = artist ? `${artist} - ${title}` : title;
    return name
      .replace(/[<>:"/\\|?*]/g, '') // Remove invalid chars
      .replace(/\s+/g, ' ') // Normalize spaces
      .trim()
      .substring(0, 200); // Limit length
  }
}
