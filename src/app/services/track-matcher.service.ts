import { Injectable, inject } from '@angular/core';
import { StringUtilsService } from './string-utils.service';
import { DiscogsTrack } from '../models/discogs.model';
import { ProcessedFile } from '../models/processed-file.model';
import { FileProcessorService } from './file-processor.service';

export interface TrackMatchResult {
  track: DiscogsTrack;
  score: number;
  matchDetails: {
    titleScore: number;
    versionScore: number;
    durationScore: number;
  };
}

/**
 * Service for matching audio files to Discogs tracks.
 * Handles scoring and selection of the best matching track.
 */
@Injectable({
  providedIn: 'root'
})
export class TrackMatcherService {
  private readonly stringUtils = inject(StringUtilsService);
  private readonly fileProcessor = inject(FileProcessorService);

  /** Minimum score required to consider a match valid */
  private readonly MIN_MATCH_SCORE = 30;

  /**
   * Finds the best matching track from a list of Discogs tracks.
   */
  findBestMatch(item: ProcessedFile, tracks: DiscogsTrack[]): DiscogsTrack | undefined {
    if (!tracks || tracks.length === 0) return undefined;

    // Only real tracks (not headings)
    const realTracks = tracks.filter(t => t.type_ === 'track');
    if (realTracks.length === 0) return undefined;

    // If only 1 track, select it automatically
    if (realTracks.length === 1) {
      return realTracks[0];
    }

    // Get search data from file
    const searchTitle = item.manualTitle ||
                        item.currentTags?.title ||
                        this.fileProcessor.parseFilename(item.originalName).title;
    const fileDuration = item.currentTags?.duration;

    if (!searchTitle) return undefined;

    // Extract version/mix from search title
    const searchParsed = this.stringUtils.extractParenthesisInfo(searchTitle);
    const searchBase = searchParsed.base;
    const searchVersion = searchParsed.mixInfo.toLowerCase();

    console.log(`[TrackMatcher] Searching: "${searchTitle}" → base="${searchBase}", version="${searchVersion}"`);

    let bestMatch: DiscogsTrack | undefined;
    let bestScore = 0;

    for (const track of realTracks) {
      const result = this.scoreTrack(track, searchBase, searchVersion, fileDuration);

      console.log(`[TrackMatcher]   "${track.title}" → TOTAL: ${result.score}`);

      if (result.score > bestScore) {
        bestScore = result.score;
        bestMatch = track;
      }
    }

    console.log(`[TrackMatcher] Best match: "${bestMatch?.title}" with score ${bestScore}`);

    return bestScore >= this.MIN_MATCH_SCORE ? bestMatch : undefined;
  }

  /**
   * Scores a single track against search criteria.
   */
  private scoreTrack(
    track: DiscogsTrack,
    searchBase: string,
    searchVersion: string,
    fileDuration?: number
  ): TrackMatchResult {
    let titleScore = 0;
    let versionScore = 0;
    let durationScore = 0;

    // Extract version from track title
    const trackParsed = this.stringUtils.extractParenthesisInfo(track.title);
    const trackBase = trackParsed.base;
    const trackVersion = trackParsed.mixInfo.toLowerCase();

    // Normalize titles for comparison
    const searchBaseNorm = this.stringUtils.normalizeTitleForMatching(searchBase);
    const trackBaseNorm = this.stringUtils.normalizeTitleForMatching(trackBase);

    // === TITLE BASE (0-40 points) ===
    if (searchBaseNorm === trackBaseNorm) {
      titleScore = 40; // Exact match (normalized)
    } else if (trackBaseNorm.includes(searchBaseNorm) || searchBaseNorm.includes(trackBaseNorm)) {
      titleScore = 30; // One contains the other
    } else {
      // Partial similarity
      const similarity = this.stringUtils.calculateStringSimilarity(searchBaseNorm, trackBaseNorm);
      titleScore = similarity * 25;
    }

    // === VERSION/MIX (0-50 points) - MOST IMPORTANT ===
    if (searchVersion && trackVersion) {
      const normSearchVersion = searchVersion.replace(/[.\-_]/g, '').replace(/\s+/g, ' ').trim();
      const normTrackVersion = trackVersion.replace(/[.\-_]/g, '').replace(/\s+/g, ' ').trim();

      if (normSearchVersion === normTrackVersion) {
        versionScore = 50; // Exact version match
        console.log(`[TrackMatcher]   "${track.title}" → VERSION EXACT MATCH! +50`);
      } else if (normTrackVersion.includes(normSearchVersion) || normSearchVersion.includes(normTrackVersion)) {
        versionScore = 40; // Partial version match
        console.log(`[TrackMatcher]   "${track.title}" → version partial match +40`);
      } else {
        const versionSim = this.stringUtils.calculateStringSimilarity(normSearchVersion, normTrackVersion);
        if (versionSim > 0.5) {
          versionScore = versionSim * 30;
          console.log(`[TrackMatcher]   "${track.title}" → version similarity ${(versionSim * 100).toFixed(0)}%`);
        }
      }
    } else if (searchVersion && !trackVersion) {
      // Looking for specific version but track doesn't have one → penalize
      versionScore = -10;
    } else if (!searchVersion && trackVersion) {
      // Not looking for version but track has one → slight penalty
      versionScore = -5;
    }

    // === DURATION (0-10 points) - Secondary factor ===
    if (fileDuration && track.duration) {
      const trackDurationSec = this.parseDurationToSeconds(track.duration);
      if (trackDurationSec > 0) {
        const diff = Math.abs(fileDuration - trackDurationSec);
        if (diff <= 3) durationScore = 10;       // Almost exact
        else if (diff <= 10) durationScore = 7;  // Very close
        else if (diff <= 20) durationScore = 4;  // Close
        else if (diff <= 30) durationScore = 2;  // Acceptable
      }
    }

    const totalScore = titleScore + versionScore + durationScore;

    return {
      track,
      score: totalScore,
      matchDetails: {
        titleScore,
        versionScore,
        durationScore
      }
    };
  }

  /**
   * Converts duration string "M:SS" or "MM:SS" to seconds.
   */
  private parseDurationToSeconds(duration: string): number {
    if (!duration) return 0;

    const parts = duration.split(':');
    if (parts.length === 2) {
      const minutes = parseInt(parts[0], 10) || 0;
      const seconds = parseInt(parts[1], 10) || 0;
      return minutes * 60 + seconds;
    } else if (parts.length === 3) {
      // H:MM:SS
      const hours = parseInt(parts[0], 10) || 0;
      const minutes = parseInt(parts[1], 10) || 0;
      const seconds = parseInt(parts[2], 10) || 0;
      return hours * 3600 + minutes * 60 + seconds;
    }
    return 0;
  }
}
