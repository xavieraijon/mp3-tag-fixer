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

    // If hints contain garbage, fallback to parsed
    if (!candidateArtist || this.detectGarbage(candidateArtist)) {
      candidateArtist = parsedArtist;
    }
    if (!candidateTitle || this.detectGarbage(candidateTitle)) {
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
    let cleaned = baseFilename
      .replace(/-\d+\.\d+-\d+-\d+$/, '')
      .replace(/-\d{6,}$/, '')
      .trim();

    const parts = cleaned.split(' - ');
    if (parts.length >= 2) {
      return {
        artist: parts[0].trim(),
        title: parts.slice(1).join(' - ').trim(),
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

    // 3. Title Only Search
    if (titleBase.length > 3) {
      strategies.push({
        type: 'title_only',
        query: titleBase,
        description: `Title Only: "${titleBase}"`,
        priority: priority++,
        params: { track: titleBase },
      });
    }

    // 4. Fuzzy Variants
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
}
