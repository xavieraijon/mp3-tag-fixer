import { Injectable } from '@nestjs/common';
import { StringUtilsService } from './string-utils.service';
import { DiscogsService, DiscogsRelease } from './discogs.service';

export interface SearchStrategy {
  type: 'release' | 'track' | 'query';
  artist: string;
  title: string;
  searchType: 'master' | 'release' | 'all';
  description: string;
  priority: number;
}

export interface SearchResult extends DiscogsRelease {
  _score?: number;
}

/**
 * Service for searching Discogs with intelligent strategies.
 * Generates multiple search strategies and scores results.
 */
@Injectable()
export class SearchService {
  /** API delay between requests (Discogs limit: 60/min) */
  private readonly API_DELAY = 1200;

  /** Score thresholds for stopping search early */
  private readonly EXCELLENT_SCORE = 70;
  private readonly GOOD_SCORE = 50;
  private readonly MIN_RESULTS_FOR_GOOD = 3;

  constructor(
    private readonly stringUtils: StringUtilsService,
    private readonly discogs: DiscogsService,
  ) {}

  /**
   * Generates all possible search strategies for an artist/title combination.
   */
  generateStrategies(artist: string, title: string): SearchStrategy[] {
    const strategies: SearchStrategy[] = [];
    let priority = 0;

    // === PHASE 0: DIRECT SEARCH (highest priority) ===
    if (artist && title) {
      // 0.1 Direct query: "Artist - Title"
      strategies.push({
        type: 'query',
        artist: '',
        title: `${artist} - ${title}`,
        searchType: 'all',
        description: `Direct: "${artist} - ${title}"`,
        priority: priority++,
      });

      // 0.2 Query without dash
      strategies.push({
        type: 'query',
        artist: '',
        title: `${artist} ${title}`,
        searchType: 'all',
        description: `Direct: "${artist} ${title}"`,
        priority: priority++,
      });

      // 0.3 Exact track search
      strategies.push({
        type: 'track',
        artist: artist,
        title: title,
        searchType: 'all',
        description: `Track exact: "${artist}" - "${title}"`,
        priority: priority++,
      });

      // 0.4 Exact release search
      strategies.push({
        type: 'release',
        artist: artist,
        title: title,
        searchType: 'master',
        description: `Master exact: "${artist}" - "${title}"`,
        priority: priority++,
      });
    }

    // Generate variants for more complex searches
    const artistVariants = this.stringUtils.normalizeArtistName(artist);
    const titleVariants = this.stringUtils.normalizeTitleForSearch(title);
    const titleParsed = this.stringUtils.extractParenthesisInfo(title);

    // === PHASE 1: Base title searches (without parentheses) ===
    if (titleParsed.base !== title && titleParsed.base.length > 2) {
      strategies.push({
        type: 'query',
        artist: '',
        title: `${artist} - ${titleParsed.base}`,
        searchType: 'all',
        description: `Direct base: "${artist} - ${titleParsed.base}"`,
        priority: priority++,
      });

      strategies.push({
        type: 'query',
        artist: '',
        title: `${artist} ${titleParsed.base}`,
        searchType: 'all',
        description: `Query base: "${artist} ${titleParsed.base}"`,
        priority: priority++,
      });

      strategies.push({
        type: 'track',
        artist: artist,
        title: titleParsed.base,
        searchType: 'all',
        description: `Track base: "${artist}" - "${titleParsed.base}"`,
        priority: priority++,
      });

      strategies.push({
        type: 'release',
        artist: artist,
        title: titleParsed.base,
        searchType: 'master',
        description: `Master base: "${artist}" - "${titleParsed.base}"`,
        priority: priority++,
      });
    }

    // === PHASE 2: Artist variants ===
    for (const a of artistVariants.slice(1, 4)) {
      strategies.push({
        type: 'track',
        artist: a,
        title: titleParsed.base,
        searchType: 'all',
        description: `Track: "${a}" - "${titleParsed.base}"`,
        priority: priority++,
      });
    }

    // === PHASE 3: Release searches with variants ===
    for (const a of artistVariants.slice(1, 3)) {
      for (const t of titleVariants.slice(0, 2)) {
        strategies.push({
          type: 'release',
          artist: a,
          title: t,
          searchType: 'master',
          description: `Master: "${a}" - "${t}"`,
          priority: priority++,
        });
      }
    }

    // === PHASE 4: Broader searches ===
    strategies.push({
      type: 'track',
      artist: '',
      title: titleParsed.base,
      searchType: 'all',
      description: `Track any artist: "${titleParsed.base}"`,
      priority: priority++,
    });

    strategies.push({
      type: 'query',
      artist: '',
      title: titleParsed.base,
      searchType: 'all',
      description: `Query title only: "${titleParsed.base}"`,
      priority: priority++,
    });

    for (const a of artistVariants.slice(0, 2)) {
      strategies.push({
        type: 'release',
        artist: a,
        title: '',
        searchType: 'master',
        description: `Artist only: "${a}"`,
        priority: priority++,
      });
    }

    // === PHASE 5: Fallbacks ===
    for (const a of artistVariants.slice(0, 2)) {
      for (const t of titleVariants.slice(0, 2)) {
        strategies.push({
          type: 'release',
          artist: a,
          title: t,
          searchType: 'release',
          description: `Release: "${a}" - "${t}"`,
          priority: priority++,
        });
      }
    }

    // Swapped artist/title
    if (artist && title && artist !== title) {
      strategies.push({
        type: 'track',
        artist: titleParsed.base,
        title: artist,
        searchType: 'all',
        description: `Swapped: "${titleParsed.base}" - "${artist}"`,
        priority: priority++,
      });
    }

    // Remove duplicates and sort
    const seen = new Set<string>();
    return strategies
      .sort((a, b) => a.priority - b.priority)
      .filter((s) => {
        const key = `${s.type}:${s.artist}:${s.title}:${s.searchType}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
  }

  /**
   * Executes a single search strategy.
   */
  async executeStrategy(strategy: SearchStrategy): Promise<DiscogsRelease[]> {
    switch (strategy.type) {
      case 'track':
        return this.discogs.searchByTrack(
          strategy.artist,
          strategy.title,
          strategy.searchType,
        );
      case 'query':
        return this.discogs.searchQuery(strategy.title, strategy.searchType);
      case 'release':
        return this.discogs.searchRelease(
          strategy.artist,
          strategy.title,
          strategy.searchType,
        );
      default:
        return [];
    }
  }

  /**
   * Calculates relevance score for a search result.
   */
  calculateResultScore(
    result: DiscogsRelease,
    searchArtist: string,
    searchTitle: string,
  ): number {
    let score = 0;
    const resultArtist = result.artist || '';
    const resultTitle = result.title || '';

    // === ARTIST MATCHING (0-60 points) ===
    const normalizedResultArtist =
      this.stringUtils.normalizeArtistForComparison(resultArtist);
    const normalizedSearchArtist =
      this.stringUtils.normalizeArtistForComparison(searchArtist);

    const artistSimilarity = this.stringUtils.calculateStringSimilarity(
      normalizedResultArtist,
      normalizedSearchArtist,
    );

    let artistScore = 0;
    if (artistSimilarity >= 0.85) {
      artistScore = 60;
    } else if (artistSimilarity >= 0.7) {
      artistScore = 50;
    } else if (artistSimilarity >= 0.5) {
      artistScore = 30;
    } else if (artistSimilarity >= 0.4) {
      artistScore = 15;
    }
    score += artistScore;

    // === TITLE MATCHING (0-30 points) ===
    const titleParsed = this.stringUtils.extractParenthesisInfo(searchTitle);
    const baseTitle = titleParsed.base.toLowerCase();
    const resultTitleLower = resultTitle.toLowerCase();

    let titleScore = 0;
    if (resultTitleLower === baseTitle) {
      titleScore = 30;
    } else if (resultTitleLower.includes(baseTitle)) {
      titleScore = 25;
    } else if (baseTitle.includes(resultTitleLower)) {
      titleScore = 20;
    } else {
      const searchWords = baseTitle.split(/\s+/).filter((w) => w.length > 2);
      const resultWords = resultTitleLower.split(/\s+/);

      if (searchWords.length > 0) {
        let matchedWords = 0;
        for (const sw of searchWords) {
          if (resultWords.some((rw) => rw.includes(sw) || sw.includes(rw))) {
            matchedWords++;
          }
        }
        titleScore = (matchedWords / searchWords.length) * 15;
      }
    }

    // Penalty: if artist doesn't match well, limit title points
    if (artistSimilarity < 0.5) {
      titleScore = Math.min(titleScore, 10);
    }
    score += titleScore;

    // === BONUS POINTS (0-10 points) ===
    if (result.year) score += 2;
    if (result.type === 'master') score += 2;
    if (result.thumb || result.cover_image) score += 1;

    const genres = [...(result.genres || []), ...(result.styles || [])].map(
      (g) => g.toLowerCase(),
    );
    if (
      genres.some((g) =>
        [
          'electronic',
          'techno',
          'house',
          'trance',
          'dance',
          'hardcore',
          'gabber',
          'makina',
        ].includes(g),
      )
    ) {
      score += 3;
    }

    if (artistSimilarity >= 0.7 && resultTitleLower.includes(baseTitle)) {
      score += 2;
    }

    return Math.round(score);
  }

  /**
   * Performs a full search with multiple strategies.
   * Returns sorted results by score.
   */
  async search(
    artist: string,
    title: string,
    onProgress?: (message: string) => void,
  ): Promise<SearchResult[]> {
    const strategies = this.generateStrategies(artist, title);

    console.log(
      `[SearchService] Generated ${strategies.length} strategies for "${artist} - ${title}"`,
    );

    const allResults: SearchResult[] = [];
    let attemptCount = 0;
    const maxAttempts = 15;

    for (const strategy of strategies.slice(0, maxAttempts)) {
      attemptCount++;

      if (onProgress) {
        onProgress(
          `Search ${attemptCount}/${Math.min(strategies.length, maxAttempts)}: ${strategy.description}`,
        );
      }

      try {
        const results = await this.executeStrategy(strategy);

        console.log(
          `[SearchService] Strategy "${strategy.description}" returned ${results.length} results`,
        );

        if (results.length > 0) {
          for (const r of results) {
            if (!allResults.some((existing) => existing.id === r.id)) {
              const scored = r as SearchResult;
              scored._score = this.calculateResultScore(r, artist, title);
              allResults.push(scored);
            }
          }

          allResults.sort((a, b) => (b._score || 0) - (a._score || 0));

          const topScore = allResults[0]?._score || 0;

          if (topScore >= this.EXCELLENT_SCORE) {
            console.log(
              `[SearchService] Excellent match found (score ${topScore}), stopping`,
            );
            break;
          }

          if (
            allResults.length >= this.MIN_RESULTS_FOR_GOOD &&
            topScore >= this.GOOD_SCORE
          ) {
            console.log(
              `[SearchService] Found ${allResults.length} results with top score ${topScore}, stopping`,
            );
            break;
          }
        }
      } catch (e) {
        console.warn(
          `[SearchService] Strategy "${strategy.description}" failed:`,
          e,
        );
      }

      await this.delay(this.API_DELAY);
    }

    // Log final ranking
    if (allResults.length > 0) {
      console.log(`[SearchService] Final ranking for "${artist} - ${title}":`);
      allResults.slice(0, 5).forEach((r, i) => {
        console.log(
          `  ${i + 1}. [Score: ${r._score}] ${r.artist} - ${r.title}`,
        );
      });
    }

    return allResults;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
