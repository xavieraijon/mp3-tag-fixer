import { Injectable, Logger } from '@nestjs/common';
import { StringUtils } from '../../shared';
import { MatchResult } from '../dto/search-query.dto';
import {
  RankTracksDto,
  RankedTrackDto,
  TrackCandidateDto,
} from '../dto/rank-tracks.dto';

@Injectable()
export class DiscogsMatchService {
  private readonly logger = new Logger(DiscogsMatchService.name);
  private readonly EXCELLENT_SCORE = 70;
  private readonly GOOD_SCORE = 50;

  /**
   * Calculates the match score for a Discogs result against the search criteria.
   * Moved from CorrectionService.
   */
  calculateResultScore(
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

    // Fuzzy check if direct similarity is low
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

    // Artist Score
    let artistScore = 0;
    if (artistSimilarity >= 0.85) artistScore = 60;
    else if (artistSimilarity >= 0.7) artistScore = 50;
    else if (artistSimilarity >= 0.5) artistScore = 30;
    else if (artistSimilarity >= 0.4) artistScore = 15;
    else if (artistSimilarity >= 0.3) artistScore = 5;

    score += artistScore;

    // Title Score
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

    // Bonus points
    if (result.year) score += 2;
    if (result.type === 'master') score += 2;
    if (result.cover_image) score += 1;

    return Math.round(score);
  }

  /**
   * Ranks a list of tracks against search criteria
   * Moved from CorrectionService.
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
}
