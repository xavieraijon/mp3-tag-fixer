export class FilenameParser {
  /**
   * Limpia prefijos comunes de nombres de archivo
   */
  static cleanPrefix(str: string): string {
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
   */
  static cleanSuffix(str: string): string {
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
      cleaned = cleaned.replace(
        /[-_][A-Za-z][^-]*[-_](?:CD|Vol|Part|Disc)\s*\.?\s*\d+[-_]\d+$/i,
        '',
      );

      // Formato .vinyl-label-Other-código
      cleaned = cleaned.replace(/\.vinyl[-_][^-]+[-_][^-]+[-_]\d+$/i, '');

      // Artista repetido al final: -ArtistName-código
      cleaned = cleaned.replace(/[-_][A-Za-z][A-Za-z\s]+[-_]\d{4,}$/, '');

      // Sufijos simples: -mp3, -wav, etc
      cleaned = cleaned.replace(
        /[-_](?:mp3|wav|flac|aiff|lyrics|vinyl|Other)$/i,
        '',
      );

      // Paréntesis con indicadores de calidad
      cleaned = cleaned.replace(
        /\s*\((?:hq|lq|high|low|med)(?:\s+quality)?\)$/i,
        '',
      );
      cleaned = cleaned.replace(/\s*\(\d{2,3}\s*(?:kbps|kb\/s|kbs)?\)$/i, '');
      cleaned = cleaned.replace(/\s*\((?:mp3|wav|flac|aac|ogg|wma)\)$/i, '');

      // Atribución "-by username"
      cleaned = cleaned.replace(/[-_]by[\s_]+[a-zA-Z0-9_]+[-_]?\d*$/i, '');

      // Número simple al final después de guión (si hay paréntesis antes)
      cleaned = cleaned.replace(/(\))[-_]\d{1,2}$/, '$1');

      // Número simple al final
      cleaned = cleaned.replace(/([a-zA-Z)])[-_]\d{1,2}$/, '$1');

      // Guiones finales con basura
      cleaned = cleaned.replace(/[-_]+$/, '');
    }

    return cleaned.trim();
  }

  /**
   * Verifica si un string parece ser un número de track
   */
  static looksLikeTrackNumber(str: string): boolean {
    const trimmed = str.trim();
    if (/^\d{1,3}$/.test(trimmed)) return true;
    if (/^\d{1,2}\.\d{0,2}$/.test(trimmed)) return true;
    if (/^[A-D][1-9]$/i.test(trimmed)) return true;
    return false;
  }

  /**
   * Verifica si un string parece metadata y NO un artista
   */
  static looksLikeMetadataNotArtist(str: string): boolean {
    const trimmed = str.trim().replace(/^['"`]+|['"`]+$/g, '');
    if (/^\d{1,3}$/.test(trimmed)) return true;
    if (/^\d{1,2}\.\d{0,2}$/.test(trimmed)) return true;
    if (/^[A-D][1-9¹²³]$/i.test(trimmed)) return true;
    if (/^(19[89]\d|20[0-2]\d)$/.test(trimmed)) return true;
    if (/^\d{5,}$/.test(trimmed)) return true;
    return false;
  }

  /**
   * Intenta extraer artista y título de un string limpio
   */
  static extractArtistTitle(str: string): {
    artist: string;
    title: string;
    confidence: number;
  } {
    const standardParts = str.split(' - ');

    if (standardParts.length >= 2) {
      let artistIndex = 0;

      while (
        artistIndex < standardParts.length - 1 &&
        this.looksLikeMetadataNotArtist(standardParts[artistIndex])
      ) {
        artistIndex++;
      }

      const artist = standardParts[artistIndex].trim();
      const title = standardParts
        .slice(artistIndex + 1)
        .join(' - ')
        .trim();

      if (artist.length >= 2 && title.length >= 2) {
        return { artist, title, confidence: 0.9 };
      }
    }

    const compactParts = str.split('-');
    if (compactParts.length >= 2) {
      for (let i = 1; i < compactParts.length; i++) {
        const artist = compactParts.slice(0, i).join('-').trim();
        const title = compactParts.slice(i).join('-').trim();

        if (
          artist.length >= 2 &&
          !this.looksLikeTrackNumber(artist) &&
          title.length >= 2
        ) {
          return { artist, title, confidence: 0.7 };
        }
      }
    }

    return { artist: '', title: str, confidence: 0.3 };
  }

  /**
   * Parser inteligente de nombres de archivo
   */
  static parseFilename(filename: string): { artist: string; title: string } {
    const base = filename.replace(/\.(mp3|wav|flac|aiff|m4a|ogg)$/i, '');

    let cleaned = this.cleanPrefix(base);
    cleaned = this.cleanSuffix(cleaned);

    const result = this.extractArtistTitle(cleaned);

    if (result.title) {
      result.title = this.cleanSuffix(result.title);

      if (
        result.artist &&
        result.title.toLowerCase().endsWith(result.artist.toLowerCase())
      ) {
        const idx = result.title
          .toLowerCase()
          .lastIndexOf(result.artist.toLowerCase());
        if (idx > 0) {
          result.title = result.title
            .substring(0, idx)
            .replace(/[-_\s]+$/, '')
            .trim();
        }
      }
    }

    result.artist = result.artist.replace(/^[-_.\s]+|[-_.\s]+$/g, '').trim();
    result.title = result.title.replace(/^[-_.\s]+|[-_.\s]+$/g, '').trim();

    return { artist: result.artist, title: result.title };
  }
}
