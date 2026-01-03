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
  providedIn: 'root'
})
export class FileProcessorService {

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  constructor() { }

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
        duration: metadata.format.duration
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
   * Limpia prefijos comunes de nombres de archivo
   * Ejemplos: (A2), [B2], 01., 1 -, 02 - , [Label Info], etc.
   * También soporta superíndices: ¹²³
   */
  private cleanPrefix(str: string): string {
    let cleaned = str.trim();
    let prev = '';

    // Limpiar comillas/apóstrofes al inicio
    cleaned = cleaned.replace(/^['"`]+/, '');

    // Iterar hasta que no haya más cambios
    while (cleaned !== prev) {
      prev = cleaned;

      // Año al inicio con separador: 1996 - , 2010 -
      cleaned = cleaned.replace(/^(19[89]\d|20[0-2]\d)\s*[-:]\s*/i, '');

      // Códigos de vinilo: (A1), [B2], (A2), [A1], etc.
      // Incluye superíndices: ¹²³ (códigos Unicode 185, 178, 179)
      cleaned = cleaned.replace(/^[([ ]?[A-D][1-9¹²³][)\] ]?\s*[-:]?\s*/i, '');

      // Track con guión espaciado: "02 - ", "1 - " (IMPORTANTE: antes de otros patrones)
      cleaned = cleaned.replace(/^\d{1,2}\s+-\s+/i, '');

      // Números de track con punto y subtrack: 1.04., 2.01.
      cleaned = cleaned.replace(/^\d{1,2}\.\d{1,2}\.?\s*/i, '');

      // Números de track: 01., 1., 01-, 1-, 08, etc.
      cleaned = cleaned.replace(/^\d{1,2}[.)-]\s*/i, '');
      cleaned = cleaned.replace(/^\d{1,2}\s+(?=[A-Z])/i, '');

      // Corchetes con info de label/año: [Label (CODE) 1998 A2] -
      cleaned = cleaned.replace(/^\[[^\]]*\]\s*[-:]?\s*/i, '');

      // Paréntesis con códigos: (NM 5085 MX) etc al inicio
      cleaned = cleaned.replace(/^\([^)]*(?:MX|CODE|CAT|VOL)[^)]*\)\s*/i, '');
    }

    return cleaned.trim();
  }

  /**
   * Limpia sufijos comunes de nombres de archivo
   * Ejemplos: -2010-1-003236, .vinyl-label-003932, -6.47-212-003781, -2010-1
   */
  private cleanSuffix(str: string): string {
    let cleaned = str.trim();
    let prev = '';

    while (cleaned !== prev) {
      prev = cleaned;

      // Códigos numéricos finales: -003236, -000980 (5+ dígitos)
      cleaned = cleaned.replace(/[-_]\d{5,}$/, '');

      // Patrón año-número-código completo: -2010-1-003236
      cleaned = cleaned.replace(/[-_]\d{4}[-_]\d+[-_]\d+$/, '');

      // Patrón año-número (sin código): -2010-1, -1998-2
      cleaned = cleaned.replace(/[-_]\d{4}[-_]\d{1,2}$/, '');

      // Solo año al final: -2010, -1998 (pero solo si hay algo antes)
      cleaned = cleaned.replace(/(.{5,})[-_]\d{4}$/, '$1');

      // Duración y códigos (3 partes): -6.47-212-003781
      cleaned = cleaned.replace(/[-_]\d+\.\d+[-_]\d+[-_]\d+$/, '');

      // Duración y bitrate (2 partes): -8.51-128, -6.47-320
      cleaned = cleaned.replace(/[-_]\d{1,2}\.\d{2}[-_]\d{2,3}$/, '');

      // Duración simple al final: -6.47, -5.23
      cleaned = cleaned.replace(/[-_]\d{1,2}\.\d{2}$/, '');

      // Nombre de álbum/label al final: -Sound of Acid Core - Vol.1 - CD2-002061
      cleaned = cleaned.replace(/[-_][A-Za-z][^-]*[-_](?:CD|Vol|Part|Disc)\s*\.?\s*\d+[-_]\d+$/i, '');

      // Formato .vinyl-label-Other-código
      cleaned = cleaned.replace(/\.vinyl[-_][^-]+[-_][^-]+[-_]\d+$/i, '');

      // Artista repetido al final: -ArtistName-código
      cleaned = cleaned.replace(/[-_][A-Za-z][A-Za-z\s]+[-_]\d{4,}$/, '');

      // Sufijos simples: -mp3, -wav, etc
      cleaned = cleaned.replace(/[-_](?:mp3|wav|flac|aiff|lyrics|vinyl|Other)$/i, '');

      // Paréntesis con indicadores de calidad: (Hq Quality), (HQ), (High Quality), (320kbps), (128), etc
      cleaned = cleaned.replace(/\s*\((?:hq|lq|high|low|med)(?:\s+quality)?\)$/i, '');
      cleaned = cleaned.replace(/\s*\(\d{2,3}\s*(?:kbps|kb\/s|kbs)?\)$/i, '');
      cleaned = cleaned.replace(/\s*\((?:mp3|wav|flac|aac|ogg|wma)\)$/i, '');

      // Atribución "-by username" o "-by_username": -by bazofia, -by_dj123
      cleaned = cleaned.replace(/[-_]by[\s_]+[a-zA-Z0-9_]+[-_]?\d*$/i, '');

      // Número simple al final después de guión (si hay paréntesis antes): )-1, )-2
      cleaned = cleaned.replace(/(\))[-_]\d{1,2}$/, '$1');

      // Número simple al final: -1, -2 (después de texto)
      cleaned = cleaned.replace(/([a-zA-Z)])[-_]\d{1,2}$/, '$1');

      // Guiones finales con basura
      cleaned = cleaned.replace(/[-_]+$/, '');
    }

    return cleaned.trim();
  }

  /**
   * Verifica si un string parece ser un número de track
   */
  private looksLikeTrackNumber(str: string): boolean {
    const trimmed = str.trim();
    // Solo números: 01, 1, 12
    if (/^\d{1,3}$/.test(trimmed)) return true;
    // Número con punto: 1.04, 01.
    if (/^\d{1,2}\.\d{0,2}$/.test(trimmed)) return true;
    // Código de vinilo: A1, B2
    if (/^[A-D][1-9]$/i.test(trimmed)) return true;
    return false;
  }

  /**
   * Verifica si un string parece metadata (año, track, código) y NO un artista
   * Usado para saltar partes irrelevantes en filenames con múltiples " - "
   */
  private looksLikeMetadataNotArtist(str: string): boolean {
    // Limpiar comillas, apóstrofes y espacios
    const trimmed = str.trim().replace(/^['"`]+|['"`]+$/g, '');

    // Track numbers: 01, 1, 12, 001
    if (/^\d{1,3}$/.test(trimmed)) return true;

    // Número con punto: 1.04, 01.
    if (/^\d{1,2}\.\d{0,2}$/.test(trimmed)) return true;

    // Código de vinilo: A1, B2
    if (/^[A-D][1-9¹²³]$/i.test(trimmed)) return true;

    // Años: 1990-2029
    if (/^(19[89]\d|20[0-2]\d)$/.test(trimmed)) return true;

    // Códigos numéricos largos: 003254, 000858
    if (/^\d{5,}$/.test(trimmed)) return true;

    return false;
  }

  /**
   * Intenta extraer artista y título de un string limpio
   */
  private extractArtistTitle(str: string): { artist: string, title: string, confidence: number } {
    // Buscar el separador " - " que es el más común
    const standardParts = str.split(' - ');

    if (standardParts.length >= 2) {
      let artistIndex = 0;

      // Saltar partes iniciales que parecen metadata (años, tracks, códigos) y no artistas
      while (artistIndex < standardParts.length - 1 &&
             this.looksLikeMetadataNotArtist(standardParts[artistIndex])) {
        artistIndex++;
      }

      const artist = standardParts[artistIndex].trim();
      const title = standardParts.slice(artistIndex + 1).join(' - ').trim();

      // Alta confianza si ambos tienen contenido razonable
      if (artist.length >= 2 && title.length >= 2) {
        return { artist, title, confidence: 0.9 };
      }
    }

    // Buscar separador "-" compacto (sin espacios)
    const compactParts = str.split('-');
    if (compactParts.length >= 2) {
      // Encontrar el mejor punto de división
      for (let i = 1; i < compactParts.length; i++) {
        const artist = compactParts.slice(0, i).join('-').trim();
        const title = compactParts.slice(i).join('-').trim();

        // Verificar que el artista no sea solo un número o parezca track number
        if (artist.length >= 2 && !this.looksLikeTrackNumber(artist) && title.length >= 2) {
          return { artist, title, confidence: 0.7 };
        }
      }
    }

    // No se pudo separar
    return { artist: '', title: str, confidence: 0.3 };
  }

  /**
   * Parser inteligente de nombres de archivo
   * Maneja múltiples formatos comunes de archivos de música
   */
  parseFilename(filename: string): { artist: string, title: string } {
    // Quitar extensión
    const base = filename.replace(/\.(mp3|wav|flac|aiff|m4a|ogg)$/i, '');

    console.log(`[ParseFilename] Original: "${base}"`);

    // Paso 1: Limpiar prefijos (track numbers, vinyl codes, etc.)
    let cleaned = this.cleanPrefix(base);
    console.log(`[ParseFilename] After prefix clean: "${cleaned}"`);

    // Paso 2: Limpiar sufijos (códigos, años, duraciones, etc.)
    cleaned = this.cleanSuffix(cleaned);
    console.log(`[ParseFilename] After suffix clean: "${cleaned}"`);

    // Paso 3: Intentar extraer artista y título
    const result = this.extractArtistTitle(cleaned);

    // Paso 4: Si el título aún tiene basura, limpiar más
    if (result.title) {
      result.title = this.cleanSuffix(result.title);

      // Quitar artista duplicado del título
      if (result.artist && result.title.toLowerCase().endsWith(result.artist.toLowerCase())) {
        const idx = result.title.toLowerCase().lastIndexOf(result.artist.toLowerCase());
        if (idx > 0) {
          result.title = result.title.substring(0, idx).replace(/[-_\s]+$/, '').trim();
        }
      }
    }

    // Paso 5: Limpiar caracteres especiales residuales
    result.artist = result.artist.replace(/^[-_.\s]+|[-_.\s]+$/g, '').trim();
    result.title = result.title.replace(/^[-_.\s]+|[-_.\s]+$/g, '').trim();

    console.log(`[ParseFilename] Result: Artist="${result.artist}", Title="${result.title}"`);

    return { artist: result.artist, title: result.title };
  }

  async detectBpm(file: File): Promise<number | undefined> {
       try {
           const buffer = await file.arrayBuffer();
           const audioContext = new (window.AudioContext || (window as unknown as WindowWithBuffer).webkitAudioContext!)();
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
      if (tags.year && tags.year > 0) (writer as unknown as ID3WriterInterface).setFrame('TYER', tags.year);
      if (tags.genre) {
          const g = Array.isArray(tags.genre) ? tags.genre : [tags.genre];
          writer.setFrame('TCON', g);
      }
      if (tags.trackNumber) writer.setFrame('TRCK', String(tags.trackNumber));
      if (tags.discNumber) writer.setFrame('TPOS', tags.discNumber);
      if (tags.label) writer.setFrame('TPUB', tags.label);
      if (tags.bpm) (writer as unknown as ID3WriterInterface).setFrame('TBPM', String(Math.floor(tags.bpm)));
      if (tags.albumArtist) writer.setFrame('TPE2', tags.albumArtist);
      if (tags.composer) (writer as unknown as ID3WriterInterface).setFrame('TCOM', [tags.composer]);

      if (tags.comment) {
          writer.setFrame('COMM', {
              description: '',
              text: tags.comment,
              language: 'eng'
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
                  useUnicodeEncoding: false
              });
          } catch (e: unknown) {
              console.warn('Could not write cover image:', e);
          }
      }

      writer.addTag();
      return writer.getBlob();
  }
}
