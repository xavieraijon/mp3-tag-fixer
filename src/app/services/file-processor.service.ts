import { Injectable } from '@angular/core';
import * as mm from 'music-metadata-browser';
import { ID3Writer } from 'browser-id3-writer';
import { Buffer } from 'buffer';
import { analyze } from 'web-audio-beat-detector';
import { Mp3Tags } from '../models/mp3-tags.model';

// Global Buffer shim
interface WindowWithBuffer extends Window {
  Buffer: typeof Buffer;
  webkitAudioContext?: typeof AudioContext;
}

(window as unknown as WindowWithBuffer).Buffer = Buffer;

interface ID3WriterInterface {
  setFrame(id: string, value: unknown): void;
  addTag(): void;
  getBlob(): Blob;
}

@Injectable({
  providedIn: 'root',
})
export class FileProcessorService {
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  constructor() {}

  async readTags(file: File): Promise<Mp3Tags> {
    try {
      const metadata = await mm.parseBlob(file);
      const common = metadata.common;

      let cover: Blob | undefined;
      if (common.picture && common.picture.length > 0) {
        const pic = common.picture[0];
        cover = new Blob([pic.data], { type: pic.format });
      }

      return {
        title: common.title,
        artist: common.artist,
        album: common.album,
        year: common.year,
        genre: common.genre,
        trackNumber: common.track.no || undefined,
        discNumber: common.disk.no ? String(common.disk.no) : undefined,
        label: common.label ? common.label[0] : undefined,
        bpm: common.bpm,
        composer: common.composer ? common.composer[0] : undefined,
        albumArtist: common.albumartist,
        comment: common.comment ? common.comment[0] : undefined,
        image: cover,
        duration: metadata.format.duration,
      };
    } catch (e: unknown) {
      console.error('Error parsing file:', e);
      return {};
    }
  }

  // Sanitizes a string for use as a filename
  sanitizeFileName(name: string): string {
    const safeName = name || '';
    let simplified = safeName.trim().replace(/\s+&\s+/g, '_&_');
    simplified = simplified.replace(/[\s,/]+/g, '_');
    return simplified.replace(/[^a-zA-Z0-9_.()&]/g, '');
  }

  /**
   * Simple filename parser (fallback).
   * Detailed parsing is now handled by the backend.
   */
  parseFilename(filename: string): { artist: string; title: string } {
    const base = filename.replace(/\.(mp3|wav|flac|aiff|m4a|ogg)$/i, '');
    const parts = base.split(' - ');
    if (parts.length >= 2) {
      return { artist: parts[0].trim(), title: parts.slice(1).join(' - ').trim() };
    }
    return { artist: '', title: base };
  }

  async detectBpm(file: File): Promise<number | undefined> {
    try {
      const buffer = await file.arrayBuffer();
      const audioContext = new (
        window.AudioContext || (window as unknown as WindowWithBuffer).webkitAudioContext!
      )();
      // decodeAudioData detaches the buffer, passing a slice if we wanted to keep it,
      // but we don't need the original buffer here anymore.
      const audioBuffer = await audioContext.decodeAudioData(buffer);

      const bpm = await analyze(audioBuffer);
      await audioContext.close();
      return Math.round(bpm);
    } catch (e) {
      console.error('BPM Detection failed:', e);
      return undefined;
    }
  }

  async writeTags(file: File, tags: Mp3Tags): Promise<Blob> {
    const buffer = await file.arrayBuffer();
    const writer = new ID3Writer(buffer);

    if (tags.title) writer.setFrame('TIT2', tags.title);
    if (tags.artist) writer.setFrame('TPE1', [tags.artist]);
    if (tags.album) writer.setFrame('TALB', tags.album);
    if (tags.year && tags.year > 0)
      (writer as unknown as ID3WriterInterface).setFrame('TYER', tags.year);
    if (tags.genre) {
      const g = Array.isArray(tags.genre) ? tags.genre : [tags.genre];
      writer.setFrame('TCON', g);
    }
    if (tags.trackNumber) writer.setFrame('TRCK', String(tags.trackNumber));
    if (tags.discNumber) writer.setFrame('TPOS', tags.discNumber);
    if (tags.label) writer.setFrame('TPUB', tags.label);
    if (tags.bpm)
      (writer as unknown as ID3WriterInterface).setFrame('TBPM', String(Math.floor(tags.bpm)));
    if (tags.albumArtist) writer.setFrame('TPE2', tags.albumArtist);
    if (tags.composer) (writer as unknown as ID3WriterInterface).setFrame('TCOM', [tags.composer]);

    if (tags.comment) {
      writer.setFrame('COMM', {
        description: '',
        text: tags.comment,
        language: 'eng',
      });
    }

    // Add cover image (APIC frame)
    if (tags.image) {
      try {
        const imageBuffer = await tags.image.arrayBuffer();
        writer.setFrame('APIC', {
          type: 3, // Front cover
          data: imageBuffer,
          description: 'Cover',
          useUnicodeEncoding: false,
        });
      } catch (e: unknown) {
        console.warn('Could not write cover image:', e);
      }
    }

    writer.addTag();
    return writer.getBlob();
  }
}
