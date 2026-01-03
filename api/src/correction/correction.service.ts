import { Injectable, Logger } from '@nestjs/common';
import { DiscogsService } from '../discogs/discogs.service';
import { MusicBrainzService } from '../musicbrainz/musicbrainz.service';
import { StringUtils } from './utils/string-utils';

import { SearchQueryDto, MatchResult } from './dto/search-query.dto';
import {
  RankTracksDto,
  RankedTrackDto,
  TrackCandidateDto,
} from './dto/rank-tracks.dto';

interface SearchStrategy {
  type: 'release' | 'track' | 'query';
  artist: string;
  title: string;
  searchType: 'master' | 'release' | 'all';
  description: string;
  priority: number;
  source?: 'discogs' | 'musicbrainz';
}

@Injectable()
export class CorrectionService {
  private readonly logger = new Logger(CorrectionService.name);
  private readonly API_DELAY = 1200;
  private readonly EXCELLENT_SCORE = 70;
  private readonly GOOD_SCORE = 50;
  private readonly MIN_RESULTS_FOR_GOOD = 3;

  constructor(
    private readonly discogs: DiscogsService,
    private readonly mbService: MusicBrainzService,
  ) {}

  async findMatches(query: SearchQueryDto): Promise<MatchResult[]> {
    const { artist, title, aiConfidence } = query;
    const strategies = this.generateStrategies(artist, title);

    let activeStrategies = strategies;
    if (aiConfidence && aiConfidence >= 0.8) {
      activeStrategies = strategies.filter(
        (s) =>
          s.priority < 10 || !s.description.toLowerCase().includes('typo-fix'),
      );
    }

    this.logger.log(
      `Generated ${activeStrategies.length} strategies for "${artist} - ${title}"`,
    );

    const allResults: MatchResult[] = [];
    const maxAttempts = 15;
    const strategiesToRun = activeStrategies.slice(0, maxAttempts);
    const BATCH_SIZE = 4;

    for (let i = 0; i < strategiesToRun.length; i += BATCH_SIZE) {
      const batch = strategiesToRun.slice(i, i + BATCH_SIZE);

      const batchResults = await Promise.all(
        batch.map(async (strategy) => {
          try {
            const res = await this.executeStrategy(strategy);
            return res;
          } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : String(e);
            this.logger.warn(
              `Strategy "${strategy.description}" failed: ${msg}`,
            );
            return [];
          }
        }),
      );

      for (const results of batchResults) {
        if (results.length > 0) {
          for (const r of results) {
            if (!allResults.some((existing) => existing.id == r.id)) {
              const scored = r;
              scored.score = this.calculateResultScore(r, artist, title);
              allResults.push(scored);
            }
          }
        }
      }

      allResults.sort((a, b) => (b.score || 0) - (a.score || 0));
      const topScore = allResults[0]?.score || 0;

      if (topScore >= 90) break;
      if (topScore >= this.EXCELLENT_SCORE) break;
      if (
        allResults.length >= this.MIN_RESULTS_FOR_GOOD &&
        topScore >= this.GOOD_SCORE
      ) {
        break;
      }

      if (i + BATCH_SIZE < strategiesToRun.length) {
        await this.delay(this.API_DELAY);
      }
    }

    return allResults;
  }

  private generateStrategies(artist: string, title: string): SearchStrategy[] {
    const strategies: SearchStrategy[] = [];
    let priority = 0;

    if (artist && title) {
      strategies.push({
        type: 'query',
        artist: '',
        title: `${artist} - ${title}`,
        searchType: 'all',
        description: `Direct: "${artist} - ${title}"`,
        priority: priority++,
      });

      strategies.push({
        type: 'release',
        artist: artist,
        title: title,
        searchType: 'release',
        description: `MB Direct: "${artist} - ${title}"`,
        priority: priority,
        source: 'musicbrainz',
      });
      priority++;

      strategies.push({
        type: 'query',
        artist: '',
        title: `${artist} ${title}`,
        searchType: 'all',
        description: `Direct: "${artist} ${title}"`,
        priority: priority++,
      });

      strategies.push({
        type: 'track',
        artist: artist,
        title: title,
        searchType: 'all',
        description: `Track exact: "${artist}" - "${title}"`,
        priority: priority++,
      });
    }

    if (!artist && title) {
      const titleWithPossibleArtist = title;

      strategies.push({
        type: 'query',
        artist: '',
        title: titleWithPossibleArtist,
        searchType: 'all',
        description: `Title only: "${titleWithPossibleArtist}"`,
        priority: priority++,
      });

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
          priority: priority++,
        });
      }
    }

    const artistVariants = StringUtils.normalizeArtistName(artist);
    // Unused but useful for future
    // const titleVariants = StringUtils.normalizeTitleForSearch(title);

    const titleParsed = StringUtils.extractParenthesisInfo(title);

    const fuzzyArtistVariants = StringUtils.generateFuzzyVariants(artist);

    for (const fuzzyArtist of fuzzyArtistVariants.slice(1, 5)) {
      strategies.push({
        type: 'query',
        artist: '',
        title: `${fuzzyArtist} - ${title}`,
        searchType: 'all',
        description: `Typo-fix: "${fuzzyArtist} - ${title}"`,
        priority: priority++,
      });

      strategies.push({
        type: 'track',
        artist: fuzzyArtist,
        title: title,
        searchType: 'all',
        description: `Typo-fix track: "${fuzzyArtist}" - "${title}"`,
        priority: priority++,
      });
    }

    // Using artistVariants
    for (const varArtist of artistVariants.slice(1, 3)) {
      strategies.push({
        type: 'track',
        artist: varArtist,
        title: title,
        searchType: 'all',
        description: `Artist Variant: "${varArtist}" - "${title}"`,
        priority: priority++,
      });
    }

    if (titleParsed.base !== title && titleParsed.base.length > 2) {
      strategies.push({
        type: 'query',
        artist: '',
        title: `${artist} - ${titleParsed.base}`,
        searchType: 'all',
        description: `Direct base: "${artist} - ${titleParsed.base}"`,
        priority: priority++,
      });
    }

    // Artist as Release
    strategies.push({
      type: 'release',
      artist: '',
      title: artist,
      searchType: 'release',
      description: `Artist as Release: "${artist}"`,
      priority: priority++,
    });

    const cleanArtist = StringUtils.cleanArtistName(artist);
    if (cleanArtist !== artist && cleanArtist.length > 2) {
      strategies.push({
        type: 'track',
        artist: cleanArtist,
        title: title,
        searchType: 'all',
        description: `Clean Artist: "${cleanArtist}" - "${title}"`,
        priority: priority++,
        source: 'discogs',
      });
    }

    const seen = new Set<string>();
    return strategies
      .sort((a, b) => a.priority - b.priority)
      .filter((s) => {
        const key = `${s.type}:${s.artist}:${s.title}:${s.searchType}:${s.source || 'discogs'}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
  }

  private async executeStrategy(
    strategy: SearchStrategy,
  ): Promise<MatchResult[]> {
    if (strategy.source === 'musicbrainz') {
      const results = await this.mbService.searchReleases(
        strategy.artist,
        strategy.title,
      );
      return results.map((r) => ({
        ...r,
        source: 'musicbrainz',
        score: 0,
      }));
    }

    let results: any[] = [];
    switch (strategy.type) {
      case 'track':
        results = await this.discogs.searchByTrack(
          strategy.artist,
          strategy.title,
          strategy.searchType,
        );
        break;
      case 'query':
        results = await this.discogs.searchQuery(
          strategy.title,
          strategy.searchType,
        );
        break;
      case 'release':
        results = await this.discogs.searchRelease(
          strategy.artist,
          strategy.title,
          strategy.searchType,
        );
        break;
    }
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return results.map((r) => ({
      ...r,
      source: 'discogs',
      score: 0,
    })) as MatchResult[];
  }

  /**
   * Ranks a list of tracks against search criteria
   */
  rankTracks(query: RankTracksDto): RankedTrackDto[] {
    const { artist, title, duration, tracks } = query;
    const scoredTracks: RankedTrackDto[] = [];

    const searchTitleParsed = StringUtils.extractParenthesisInfo(title);
    const searchArtistParsed = StringUtils.extractParenthesisInfo(artist);

    for (const track of tracks) {
      if (!track.title || !track.position) continue;

      let bestScore = -1;
      let matchDetails = { titleScore: 0, versionScore: 0, durationScore: 0 };

      // Strategy 1: Title vs Track Title
      const score1 = this.scoreTrackVariant(
        track,
        searchTitleParsed.base,
        searchTitleParsed.mixInfo.toLowerCase(),
        duration,
      );

      bestScore = score1.total;
      matchDetails = score1.details;

      // Strategy 2: Artist vs Track Title (Swapped)
      if (searchArtistParsed) {
        const score2 = this.scoreTrackVariant(
          track,
          searchArtistParsed.base,
          searchArtistParsed.mixInfo.toLowerCase(),
          duration,
        );

        if (score2.total > bestScore && score2.total > 20) {
          bestScore = score2.total;
          matchDetails = score2.details;
        }
      }

      scoredTracks.push({
        ...track,
        score: bestScore,
        matchDetails,
      });
    }

    return scoredTracks.sort((a, b) => b.score - a.score);
  }

  private scoreTrackVariant(
    track: TrackCandidateDto,
    searchBase: string,
    searchVersion: string,
    fileDuration?: number,
  ) {
    let titleScore = 0;
    let versionScore = 0;
    let durationScore = 0;

    const trackParsed = StringUtils.extractParenthesisInfo(track.title);
    const trackBase = trackParsed.base;
    const trackVersion = trackParsed.mixInfo.toLowerCase();

    const searchBaseNorm = StringUtils.normalizeTitleForMatching(searchBase);
    const trackBaseNorm = StringUtils.normalizeTitleForMatching(trackBase);

    // Title Score (0-40)
    if (searchBaseNorm === trackBaseNorm) {
      titleScore = 40;
    } else if (
      trackBaseNorm.includes(searchBaseNorm) ||
      searchBaseNorm.includes(trackBaseNorm)
    ) {
      titleScore = 30;
    } else {
      const sim = StringUtils.calculateStringSimilarity(
        searchBaseNorm,
        trackBaseNorm,
      );
      titleScore = sim * 25;
    }

    // Version Score (0-50)
    if (searchVersion && trackVersion) {
      const ns = searchVersion
        .replace(/[.\-_]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
      const nt = trackVersion
        .replace(/[.\-_]/g, '')
        .replace(/\s+/g, ' ')
        .trim();

      if (ns === nt) {
        versionScore = 50;
      } else if (nt.includes(ns) || ns.includes(nt)) {
        versionScore = 40;
      } else {
        const sim = StringUtils.calculateStringSimilarity(ns, nt);
        if (sim > 0.5) versionScore = sim * 30;
      }
    } else if (searchVersion && !trackVersion) {
      versionScore = -10;
    } else if (!searchVersion && trackVersion) {
      versionScore = -5;
    }

    // Duration Score (0-10)
    if (fileDuration && track.duration) {
      const trackSec = this.parseDurationToSeconds(track.duration);
      if (trackSec > 0) {
        const diff = Math.abs(fileDuration - trackSec);
        if (diff <= 3) durationScore = 10;
        else if (diff <= 10) durationScore = 7;
        else if (diff <= 20) durationScore = 4;
        else if (diff <= 30) durationScore = 2;
      }
    }

    return {
      total: titleScore + versionScore + durationScore,
      details: { titleScore, versionScore, durationScore },
    };
  }

  private parseDurationToSeconds(duration: string): number {
    if (!duration) return 0;
    const parts = duration.split(':');
    if (parts.length === 2) {
      return (parseInt(parts[0], 10) || 0) * 60 + (parseInt(parts[1], 10) || 0);
    }
    return 0;
  }

  private calculateResultScore(
    result: MatchResult,
    searchArtist: string,
    searchTitle: string,
  ): number {
    let score = 0;
    const resultArtist = result.artist || '';
    const resultTitle = result.title || '';

    const normalizedResultArtist =
      StringUtils.normalizeArtistForComparison(resultArtist);
    const normalizedSearchArtist =
      StringUtils.normalizeArtistForComparison(searchArtist);

    let artistSimilarity = StringUtils.calculateStringSimilarity(
      normalizedResultArtist,
      normalizedSearchArtist,
    );

    if (artistSimilarity < 0.7) {
      const searchFuzzy = StringUtils.generateFuzzyVariants(searchArtist);
      const resultFuzzy = StringUtils.generateFuzzyVariants(resultArtist);

      for (const sf of searchFuzzy) {
        for (const rf of resultFuzzy) {
          const fuzzySim = StringUtils.calculateStringSimilarity(
            StringUtils.normalizeArtistForComparison(sf),
            StringUtils.normalizeArtistForComparison(rf),
          );
          if (fuzzySim > artistSimilarity) {
            artistSimilarity = fuzzySim;
          }
        }
      }
    }

    let artistScore = 0;
    if (artistSimilarity >= 0.85) artistScore = 60;
    else if (artistSimilarity >= 0.7) artistScore = 50;
    else if (artistSimilarity >= 0.5) artistScore = 30;
    else if (artistSimilarity >= 0.4) artistScore = 15;
    else if (artistSimilarity >= 0.3) artistScore = 5;

    score += artistScore;

    const titleParsed = StringUtils.extractParenthesisInfo(searchTitle);
    const baseTitle = titleParsed.base.toLowerCase();
    const resultTitleLower = resultTitle.toLowerCase();

    let titleScore = 0;

    const multiTitleParts = resultTitleLower
      .split(/[/+]|\s+&\s+|\s+and\s+/)
      .map((p) => p.trim());
    const isMultiTitleMatch = multiTitleParts.some(
      (part) => part === baseTitle || part === searchTitle.toLowerCase(),
    );

    if (resultTitleLower === baseTitle) {
      titleScore = 30;
    } else if (isMultiTitleMatch) {
      titleScore = 30;
    } else if (resultTitleLower.includes(baseTitle)) {
      titleScore = 25;
    } else if (baseTitle.includes(resultTitleLower)) {
      titleScore = 20;
    } else {
      // Simplified word matching
      if (
        baseTitle.includes(resultTitleLower) ||
        resultTitleLower.includes(baseTitle)
      ) {
        titleScore = 15;
      }
    }

    score += titleScore;

    if (result.year) score += 2;
    if (result.type === 'master') score += 2;
    if (result.cover_image) score += 1;

    return Math.round(score);
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
