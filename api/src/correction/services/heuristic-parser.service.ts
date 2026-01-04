import { Injectable, Logger } from '@nestjs/common';
import { StringUtils, SearchStrategy } from '../../shared';

export interface HeuristicResult {
  primaryCandidate: { artist: string; title: string };
  strategies: SearchStrategy[];
  confidence: number;
  hasGarbage: boolean;
  normalizedKey?: string;
}

@Injectable()
export class HeuristicParserService {
  private readonly logger = new Logger(HeuristicParserService.name);
  private readonly garbagePattern = /[ºª§ß¢¶{}þÕÛê^°¨©®™·¿¡«»×÷]+/;

  parse(
    filename: string,
    hintArtist?: string,
    hintTitle?: string,
  ): HeuristicResult {
    const base = filename.replace(/\.(mp3|wav|flac|m4a|ogg)$/i, '');

    // 1. Detect Garbage from inputs
    const hasGarbage =
      this.detectGarbage(base) ||
      (!!hintArtist && this.detectGarbage(hintArtist));

    // 2. Parse Filename
    const { artist: parsedArtist, title: parsedTitle } =
      this.extractArtistTitle(base);

    // 3. Determine Candidate
    let candidateArtist = hintArtist || '';
    let candidateTitle = hintTitle || '';

    // Check if hints have dirty prefixes (e.g. "(A2) Artist")
    const artistDirty = candidateArtist && this.hasDirtyPrefix(candidateArtist);

    // Fallback Artist First
    if (!candidateArtist || this.detectGarbage(candidateArtist) || artistDirty) {
      if (parsedArtist) candidateArtist = parsedArtist;
    }

    // Now Validated Logic for Title
    let titleDirty = candidateTitle && this.hasDirtyPrefix(candidateTitle);

    // If title starts with artist name + separator, mark as dirty to force parse fallback
    // We use the FINAL candidateArtist for this check
    if (candidateArtist && candidateTitle) {
      const cleanArt = this.normalizeStrict(candidateArtist);
      const cleanTit = this.normalizeStrict(candidateTitle);
      // Check if title (hint) starts with artist (hint or parsed)
      if (cleanTit.startsWith(cleanArt) && cleanTit.length > cleanArt.length) {
         titleDirty = true;
      }
    }

    if (!candidateTitle || this.detectGarbage(candidateTitle) || titleDirty) {
      // If original title also bad, we trust parsed
      if (parsedTitle) candidateTitle = parsedTitle;
    }

    // 4. Generate Strategies
    const strategies = this.generateStrategies(candidateArtist, candidateTitle);

    // 5. Confidence
    let confidence = 0.8;
    if (hasGarbage) confidence = 0.2;
    else if (!candidateArtist) confidence = 0.4;

    // 6. Normalization Key
    // Strict normalization: NFKD, lowercase, remove non-alphanumeric, collapse spaces
    const normalizedKey =
      candidateArtist && candidateTitle
        ? `${this.normalizeStrict(candidateArtist)}|${this.normalizeStrict(candidateTitle)}`
        : undefined;

    return {
      primaryCandidate: { artist: candidateArtist, title: candidateTitle },
      strategies,
      confidence,
      hasGarbage,
      normalizedKey,
    };
  }

  detectGarbage(text: string): boolean {
    return this.garbagePattern.test(text);
  }

  private hasDirtyPrefix(text: string): boolean {
     // Matches (A1), [B2], 01 - , (A), '1996 -, 1.04. etc.
     return (
       /^([([])([A-Z]{1,3}|[A-Z]*\d+)([)\]])\s*/i.test(text) ||
       /^\d+\s*-\s*/.test(text) ||
       /^\d+\.\d+\.?/.test(text) ||
       /^\d+\.\s*/.test(text) ||
       /^\d+$/.test(text) || // Pure numbers (e.g. "04") are likely track numbers
       /^'?\d{4}\s*-\s*/.test(text)
     );
  }

  private normalizeStrict(text: string): string {
    return text
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '') // Remove all non-alphanumeric (strict)
      .trim();
  }

  private extractArtistTitle(baseFilename: string): {
    artist: string;
    title: string;
  } {
    // 1. Pre-clean underscores
    let cleaned = baseFilename.replace(/_/g, ' ');
    if (baseFilename.includes('_-_')) {
      cleaned = baseFilename.replace(/_-_/g, ' - ').replace(/_/g, ' ');
    }

    // 2. Remove Known Suffixes (Reverse order of specificity)
    cleaned = cleaned
      .replace(/-?\d+\.\d+-\d+-\d+$/, '') // -4.29-128-004003 (Time-BPM-ID)
      .replace(/-?\d{4}-\d+-\d+$/, '')    // -2010-1-003971
      .replace(/-?\d{6,}$/, '')           // -003936
      .replace(/-[a-f0-9]+$/, '')        // hex ids
      .replace(/-by\s+.*$/i, '');        // -by bazofia...

    // 3. Remove Known Prefixes
    cleaned = cleaned
      // Matches (A1), [B2], (A), (AA)
      .replace(/^([([])([A-Z]{1,3}|[A-Z]*\d+)([)\]])\s*/i, '')
      // Matches '1996 -
      .replace(/^'?\d{4}\s*-\s*/, '')
      // Matches 1.04.
      .replace(/^\d+\.\d+\.?\s*/, '')
      // Matches 01. or 1.
      .replace(/^\d+\.\s*/, '')
      // Matches 01 - or 1 -
      .replace(/^\d+\s*-\s*/, '')
      // Matches 01- (only if no spaces around hyphen likely follow)
      .replace(/^\d+-/, '')
      .trim();

    // 4. Split Strategy
    let separator = ' - ';
    // If no standard separator, look for alternatives
    if (!cleaned.includes(' - ')) {
      // If we have just hyphens?
      if (cleaned.includes('-')) {
        // Fallback to single hyphen separator
        // Check if it's "4 Your Love" (Digit Space Word) vs "03-Dima" (Digit-Word)
        // If the start looks like a track number we missed?
        // Actually, we just need to find the split point.
        separator = '-';
      }
    }

    const parts = cleaned.split(separator);

    if (parts.length >= 2) {
      return {
        artist: parts[0].trim(),
        title: parts.slice(1).join(separator === '-' ? '-' : ' - ').trim(),
      };
    }
    return { artist: '', title: cleaned };
  }

  generateStrategies(artist: string, title: string): SearchStrategy[] {
    const strategies: SearchStrategy[] = [];
    const cleanArtist = StringUtils.cleanArtistName(artist);
    const titleBase = StringUtils.extractParenthesisInfo(title).base;

    let priority = 0;

    // 1. Exact Search
    if (cleanArtist && titleBase) {
      strategies.push({
        type: 'exact',
        query: `${cleanArtist} - ${titleBase}`,
        artist: cleanArtist,
        title: titleBase,
        description: `Direct: "${cleanArtist} - ${titleBase}"`,
        priority: priority++,
        params: { artist: cleanArtist, track: titleBase },
      });
    }

    // 2. Artist + Title Split
    if (cleanArtist.includes(' - ')) {
      const parts = cleanArtist.split(' - ');
      if (parts.length === 2) {
        strategies.push({
          type: 'split_artist',
          query: `${parts[0]} - ${parts[1]}`,
          artist: parts[0].trim(),
          title: parts[1].trim(),
          description: `Split Artist: "${parts[0]} - ${parts[1]}"`,
          priority: priority++,
          params: { artist: parts[0].trim(), track: parts[1].trim() },
        });
      }
    }

    // 3. Swap Strategy (Handle "Title - Artist" filenames)
    // Only if we have distinct parts
    if (artist && titleBase && artist !== titleBase) {
       strategies.push({
         type: 'swap',
         query: `${titleBase} - ${artist}`,
         artist: titleBase,
         title: artist,
         description: `Swap: "${titleBase} - ${artist}"`,
         priority: priority++, // Lower priority than direct match
         params: { artist: titleBase, track: artist },
       });
    }

    // 4. Parenthesis Strategy (e.g. "Release (Track)")
    // If title is "Release (Track)" and "Track" is not a mix term
    const parenMatch = titleBase.match(/^(.*?)\s*\((.*?)\)$/);
    if (parenMatch) {
      const mainPart = parenMatch[1];
      const parenPart = parenMatch[2];
      if (!this.isMixTerm(parenPart) && cleanArtist) {
        strategies.push({
          type: 'track',
          query: `${cleanArtist} - ${parenPart}`,
          artist: cleanArtist,
          title: parenPart,
          description: `Track in Parens: "${cleanArtist} - ${parenPart}"`,
          priority: priority++,
          params: { artist: cleanArtist, track: parenPart, release: mainPart },
        });
      }
    }

    // 5. Title Only Search
    if (titleBase.length > 3) {
      strategies.push({
        type: 'title_only',
        query: titleBase,
        description: `Title Only: "${titleBase}"`,
        priority: priority++,
        params: { track: titleBase },
      });
    }

    // 6. Fuzzy Variants
    const fuzzyArtists = StringUtils.generateFuzzyVariants(artist || '');
    for (const fa of fuzzyArtists.slice(0, 2)) {
      if (fa !== artist) {
        strategies.push({
          type: 'fuzzy',
          artist: fa,
          title: titleBase,
          description: `Fuzzy Artist: "${fa}"`,
          priority: priority++,
          params: { artist: fa, track: titleBase },
        });
      }
    }

    return strategies;
  }

  private isMixTerm(term: string): boolean {
    const mixKeywords = [
      'mix',
      'remix',
      'edit',
      'version',
      'dub',
      'instrumental',
      'feat',
      'ft.',
      'live',
      'vocal',
    ];
    const lower = term.toLowerCase();
    return mixKeywords.some((k) => lower.includes(k));
  }
}
