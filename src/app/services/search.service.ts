import { Injectable, inject } from '@angular/core';
import { StringUtilsService } from './string-utils.service';
import { DiscogsService } from './discogs.service';
import { DiscogsRelease } from '../models/discogs.model';

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
@Injectable({
  providedIn: 'root'
})
export class SearchService {
  private readonly stringUtils = inject(StringUtilsService);
  private readonly discogs = inject(DiscogsService);

  /** API delay between requests (Discogs limit: 60/min) */
  private readonly API_DELAY = 1200;

  /** Score thresholds for stopping search early */
  private readonly EXCELLENT_SCORE = 70;
  private readonly GOOD_SCORE = 50;
  private readonly MIN_RESULTS_FOR_GOOD = 3;

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
        priority: priority++
      });

      // 0.2 Query without dash
      strategies.push({
        type: 'query',
        artist: '',
        title: `${artist} ${title}`,
        searchType: 'all',
        description: `Direct: "${artist} ${title}"`,
        priority: priority++
      });

      // 0.3 Exact track search
      strategies.push({
        type: 'track',
        artist: artist,
        title: title,
        searchType: 'all',
        description: `Track exact: "${artist}" - "${title}"`,
        priority: priority++
      });

      // 0.4 Exact release search
      strategies.push({
        type: 'release',
        artist: artist,
        title: title,
        searchType: 'master',
        description: `Master exact: "${artist}" - "${title}"`,
        priority: priority++
      });
    }

    // === PHASE 0.1: TITLE-ONLY SEARCH (when artist is empty/garbage) ===
    // This is HIGH PRIORITY when AI returns empty artist (garbage detected)
    if (!artist && title) {
      // The title might contain "Artist - Title" format from AI parsing
      const titleWithPossibleArtist = title;

      // First, try direct query with full title
      strategies.push({
        type: 'query',
        artist: '',
        title: titleWithPossibleArtist,
        searchType: 'all',
        description: `Title only: "${titleWithPossibleArtist}"`,
        priority: priority++
      });

      // If title contains " - ", try splitting and searching as artist - title
      if (title.includes(' - ')) {
        const parts = title.split(' - ');
        const possibleArtist = parts[0].trim();
        const possibleTitle = parts.slice(1).join(' - ').trim();

        strategies.push({
          type: 'query',
          artist: '',
          title: `${possibleArtist} - ${possibleTitle}`,
          searchType: 'all',
          description: `Parsed from title: "${possibleArtist} - ${possibleTitle}"`,
          priority: priority++
        });

        strategies.push({
          type: 'track',
          artist: possibleArtist,
          title: possibleTitle,
          searchType: 'all',
          description: `Track from title: "${possibleArtist}" - "${possibleTitle}"`,
          priority: priority++
        });

        strategies.push({
          type: 'release',
          artist: possibleArtist,
          title: possibleTitle,
          searchType: 'master',
          description: `Master from title: "${possibleArtist}" - "${possibleTitle}"`,
          priority: priority++
        });
      }

      // Track search with no artist
      strategies.push({
        type: 'track',
        artist: '',
        title: titleWithPossibleArtist,
        searchType: 'all',
        description: `Track any artist: "${titleWithPossibleArtist}"`,
        priority: priority++
      });
    }

    // Generate variants for more complex searches
    const artistVariants = this.stringUtils.normalizeArtistName(artist);
    const titleVariants = this.stringUtils.normalizeTitleForSearch(title);
    const titleParsed = this.stringUtils.extractParenthesisInfo(title);

    // === PHASE 0.5: TYPO-CORRECTED SEARCH (high priority) ===
    // Generate variants that fix common typos like "Twoo" -> "Two"
    const fuzzyArtistVariants = this.stringUtils.generateFuzzyVariants(artist);
    console.log(`[SearchService] Fuzzy artist variants for "${artist}":`, fuzzyArtistVariants);

    for (const fuzzyArtist of fuzzyArtistVariants.slice(1, 5)) { // Skip original (already in phase 0)
      // Query search with fixed artist
      strategies.push({
        type: 'query',
        artist: '',
        title: `${fuzzyArtist} - ${title}`,
        searchType: 'all',
        description: `Typo-fix: "${fuzzyArtist} - ${title}"`,
        priority: priority++
      });

      // Track search with fixed artist
      strategies.push({
        type: 'track',
        artist: fuzzyArtist,
        title: title,
        searchType: 'all',
        description: `Typo-fix track: "${fuzzyArtist}" - "${title}"`,
        priority: priority++
      });

      // Release search with fixed artist (artist only - important!)
      strategies.push({
        type: 'release',
        artist: fuzzyArtist,
        title: '',
        searchType: 'master',
        description: `Typo-fix artist only: "${fuzzyArtist}"`,
        priority: priority++
      });
    }

    // === PHASE 1: Base title searches (without parentheses) ===
    if (titleParsed.base !== title && titleParsed.base.length > 2) {
      strategies.push({
        type: 'query',
        artist: '',
        title: `${artist} - ${titleParsed.base}`,
        searchType: 'all',
        description: `Direct base: "${artist} - ${titleParsed.base}"`,
        priority: priority++
      });

      strategies.push({
        type: 'query',
        artist: '',
        title: `${artist} ${titleParsed.base}`,
        searchType: 'all',
        description: `Query base: "${artist} ${titleParsed.base}"`,
        priority: priority++
      });

      strategies.push({
        type: 'track',
        artist: artist,
        title: titleParsed.base,
        searchType: 'all',
        description: `Track base: "${artist}" - "${titleParsed.base}"`,
        priority: priority++
      });

      strategies.push({
        type: 'release',
        artist: artist,
        title: titleParsed.base,
        searchType: 'master',
        description: `Master base: "${artist}" - "${titleParsed.base}"`,
        priority: priority++
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
        priority: priority++
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
          priority: priority++
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
      priority: priority++
    });

    strategies.push({
      type: 'query',
      artist: '',
      title: titleParsed.base,
      searchType: 'all',
      description: `Query title only: "${titleParsed.base}"`,
      priority: priority++
    });

    for (const a of artistVariants.slice(0, 2)) {
      strategies.push({
        type: 'release',
        artist: a,
        title: '',
        searchType: 'master',
        description: `Artist only: "${a}"`,
        priority: priority++
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
          priority: priority++
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
        priority: priority++
      });
    }

    // Remove duplicates and sort
    const seen = new Set<string>();
    return strategies
      .sort((a, b) => a.priority - b.priority)
      .filter(s => {
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
        return this.discogs.searchByTrack(strategy.artist, strategy.title, strategy.searchType);
      case 'query':
        return this.discogs.searchQuery(strategy.title, strategy.searchType);
      case 'release':
        return this.discogs.searchRelease(strategy.artist, strategy.title, strategy.searchType);
      default:
        return [];
    }
  }

  /**
   * Calculates relevance score for a search result.
   */
  calculateResultScore(result: DiscogsRelease, searchArtist: string, searchTitle: string): number {
    let score = 0;
    const resultArtist = result.artist || '';
    const resultTitle = result.title || '';

    // === ARTIST MATCHING (0-60 points) ===
    const normalizedResultArtist = this.stringUtils.normalizeArtistForComparison(resultArtist);
    const normalizedSearchArtist = this.stringUtils.normalizeArtistForComparison(searchArtist);

    // Direct similarity
    let artistSimilarity = this.stringUtils.calculateStringSimilarity(
      normalizedResultArtist,
      normalizedSearchArtist
    );

    // If direct similarity is low, try fuzzy variants (handles typos like "Twoo" -> "Two")
    if (artistSimilarity < 0.7) {
      const searchFuzzy = this.stringUtils.generateFuzzyVariants(searchArtist);
      const resultFuzzy = this.stringUtils.generateFuzzyVariants(resultArtist);

      for (const sf of searchFuzzy) {
        for (const rf of resultFuzzy) {
          const fuzzySim = this.stringUtils.calculateStringSimilarity(
            this.stringUtils.normalizeArtistForComparison(sf),
            this.stringUtils.normalizeArtistForComparison(rf)
          );
          if (fuzzySim > artistSimilarity) {
            artistSimilarity = fuzzySim;
          }
        }
      }
    }

    let artistScore = 0;
    if (artistSimilarity >= 0.85) {
      artistScore = 60;
    } else if (artistSimilarity >= 0.7) {
      artistScore = 50;
    } else if (artistSimilarity >= 0.5) {
      artistScore = 30;
    } else if (artistSimilarity >= 0.4) {
      artistScore = 15;
    } else if (artistSimilarity >= 0.3) {
      artistScore = 5;
    }
    // Note: artistSimilarity < 0.3 means artist doesn't match at all → 0 points
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
      const searchWords = baseTitle.split(/\s+/).filter(w => w.length > 2);
      const resultWords = resultTitleLower.split(/\s+/);

      if (searchWords.length > 0) {
        let matchedWords = 0;
        for (const sw of searchWords) {
          if (resultWords.some(rw => rw.includes(sw) || sw.includes(rw))) {
            matchedWords++;
          }
        }
        titleScore = (matchedWords / searchWords.length) * 15;
      }
    }

    // === ARTIST PENALTY (critical for correct matching) ===
    // If artist doesn't match well, heavily penalize title score
    // NEW: Check for CROSS-FIELD matching (Artist matches Result Title)
    // This handles "Release - Track" patterns where "Release" is mistaken for "Artist"
    const artistIntitleSimilarity = this.stringUtils.calculateStringSimilarity(
        this.stringUtils.normalizeArtistForComparison(searchArtist),
        this.stringUtils.normalizeForComparison(resultTitle)
    );

    let crossFieldBoost = 0;
    if (artistIntitleSimilarity >= 0.8) {
        console.log(`[SearchService] Cross-field match detected! Artist "${searchArtist}" found in Release Title "${resultTitle}"`);
        crossFieldBoost = 40; // Massive boost for finding the "Artist" in the Release Title
    }

    if (crossFieldBoost > 0) {
        // Apply boost and IGNORE artist mismatch penalty
        score += crossFieldBoost;
    } else {
        // Standard penalty logic (only if no cross-field match)
        if (artistSimilarity < 0.3) {
            // Artist is completely wrong - only give minimal title points
            titleScore = Math.min(titleScore, 3);
        } else if (artistSimilarity < 0.5) {
            // Artist is questionable - limit title contribution
            titleScore = Math.min(titleScore, 8);
        }

        // Extra penalty for short/generic titles with wrong artist
        // Short titles like "People Are" are very common - artist must match well
        const titleWords = baseTitle.split(/\s+/).filter(w => w.length > 2);
        if (titleWords.length <= 2 && artistSimilarity < 0.6) {
            // Short title + wrong artist = heavily penalize
            titleScore = Math.min(titleScore, 2);
        }
    }

    score += titleScore;

    // === BONUS POINTS (0-15 points) ===
    if (result.year) score += 2;
    if (result.type === 'master') score += 2;
    if (result.thumb || result.cover_image) score += 1;

    const genres = [...(result.genres || []), ...(result.styles || [])].map(g => g.toLowerCase());
    if (genres.some(g => ['electronic', 'techno', 'house', 'trance', 'dance', 'hardcore', 'gabber', 'makina'].includes(g))) {
      score += 3;
    }

    // Bonus for good artist + title containing base
    if (artistSimilarity >= 0.7 && resultTitleLower.includes(baseTitle)) {
      score += 5;
    }

    // Bonus: Artist matched after typo correction (fuzzy match success)
    // This rewards finding "Two Good" when searching "Twoo good"
    if (artistSimilarity >= 0.85) {
      score += 5; // Strong artist match bonus
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
    aiConfidence?: number // New parameter for optimization
  ): Promise<SearchResult[]> {
    const strategies = this.generateStrategies(artist, title);

    // OPTIMIZATION: If AI confidence is high (> 0.8), filter out low priority "typo" strategies
    // This assumes the AI result is likely correct and we don't need extensive fuzzy searching
    let activeStrategies = strategies;
    if (aiConfidence && aiConfidence >= 0.8) {
        console.log(`[SearchService] High AI confidence (${aiConfidence}), skipping low priority strategies`);
        // Keep only strategies with priority < 10 (Direct, Exact Track/Release)
        // OR strategies that are NOT purely fuzzy variants
        activeStrategies = strategies.filter(s =>
            s.priority < 10 || !s.description.toLowerCase().includes('typo-fix')
        );
    }

    console.log(`[SearchService] Generated ${activeStrategies.length} strategies for "${artist} - ${title}"`);

    const allResults: SearchResult[] = [];
    const maxAttempts = 15;
    const strategiesToRun = activeStrategies.slice(0, maxAttempts);

    // OPTIMIZATION: Run first batch (Direct Match) in parallel
    // These are usually the best candidates. If one hits, we might stop early.
    const BATCH_SIZE = 4;

    for (let i = 0; i < strategiesToRun.length; i += BATCH_SIZE) {
        const batch = strategiesToRun.slice(i, i + BATCH_SIZE);

        if (onProgress) {
            onProgress(`Search batch ${i/BATCH_SIZE + 1}: Checking ${batch.length} strategies...`);
        }

        // Execute batch in parallel
        const batchResults = await Promise.all(
            batch.map(async (strategy) => {
                try {
                    const res = await this.executeStrategy(strategy);
                    console.log(`[SearchService] Strategy "${strategy.description}" returned ${res.length} results`);
                    return res;
                } catch (e) {
                    console.warn(`[SearchService] Strategy "${strategy.description}" failed:`, e);
                    return [];
                }
            })
        );

        // Process results from this batch
        for (const results of batchResults) {
            if (results.length > 0) {
                for (const r of results) {
                    if (!allResults.some(existing => existing.id === r.id)) {
                        const scored = r as SearchResult;
                        scored._score = this.calculateResultScore(r, artist, title);
                        allResults.push(scored);
                    }
                }
            }
        }

        // Sort current results
        allResults.sort((a, b) => (b._score || 0) - (a._score || 0));
        const topScore = allResults[0]?._score || 0;

        // OPTIMIZATION: Early Exit Checks

        // 1. Perfect Match (> 90) - Stop immediately
        if (topScore >= 90) {
            console.log(`[SearchService] Perfect match found (score ${topScore}), stopping search early.`);
            break;
        }

        // 2. Excellent Match (> 70)
        if (topScore >= this.EXCELLENT_SCORE) {
             console.log(`[SearchService] Excellent match found (score ${topScore}), stopping.`);
             break;
        }

        // 3. Good Match (> 50) with sufficient results
        if (allResults.length >= this.MIN_RESULTS_FOR_GOOD && topScore >= this.GOOD_SCORE) {
             console.log(`[SearchService] Found ${allResults.length} results with top score ${topScore}, stopping.`);
             break;
        }

        // Delay between batches to respect rate limits (if not stopped)
        if (i + BATCH_SIZE < strategiesToRun.length) {
            await this.delay(this.API_DELAY);
        }
    }

    // Log final ranking
    if (allResults.length > 0) {
      console.log(`[SearchService] Final ranking for "${artist} - ${title}":`);
      allResults.slice(0, 5).forEach((r, i) => {
        console.log(`  ${i + 1}. [Score: ${r._score}] ${r.artist} - ${r.title}`);
      });
    }

    return allResults;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
