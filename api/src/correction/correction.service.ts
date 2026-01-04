import { Injectable, Logger } from '@nestjs/common';
import { DiscogsService } from '../discogs/discogs.service';
import { MusicBrainzService } from '../musicbrainz/musicbrainz.service';
import { SearchQueryDto, MatchResult } from './dto/search-query.dto';
import { RankTracksDto } from './dto/rank-tracks.dto';
import { HeuristicParserService } from './services/heuristic-parser.service';
import { KnowledgeService } from './services/knowledge.service';
import { DiscogsMatchService } from './services/discogs-match.service';
import { SearchStrategy } from '../shared';
import { GroqService } from '../ai/groq/groq.service';

@Injectable()
export class CorrectionService {
  private readonly logger = new Logger(CorrectionService.name);
  private readonly MIN_RESULTS_FOR_GOOD = 3;
  private readonly EXCELLENT_SCORE = 70;
  private readonly GOOD_SCORE = 50;

  constructor(
    private readonly discogs: DiscogsService,
    private readonly mbService: MusicBrainzService,
    private readonly heuristicService: HeuristicParserService,
    private readonly knowledgeService: KnowledgeService,
    private readonly matchService: DiscogsMatchService,
    private readonly groqService: GroqService,
  ) {}

  async findMatches(query: SearchQueryDto): Promise<import('./dto/search-query.dto').SearchResponseDto> {
    const { artist, title, filename, useAiFallback = true } = query;
    const rawFilename = filename || '';

    // ... (rest of the code until AI section)

    // 1. HEURISTIC PHASE
    this.logger.debug(
      `Starting Heuristic Phase for: ${rawFilename || artist + ' - ' + title}`,
    );
    const heuristic = this.heuristicService.parse(rawFilename, artist, title);
    const { primaryCandidate, strategies, confidence, hasGarbage } = heuristic;

    this.logger.debug(
      `Heuristic Result: ${JSON.stringify(primaryCandidate)} (Conf: ${confidence}, Garbage: ${hasGarbage})`,
    );

    // 2. KNOWLEDGE PHASE
    // Try to find an existing solution in our "Brain"
    const knowledgeMatch = await this.knowledgeService.findMatch(
      null, // We don't have fileHash in SearchQueryDto yet, would need to add if available
      rawFilename,
      primaryCandidate.artist,
      primaryCandidate.title,
    );

    if (knowledgeMatch) {
      this.logger.log(`Knowledge Base Match found! Returning immediately.`);
      return {
        results: [
          {
            id: `kb:${knowledgeMatch.originalTrackId}`, // synthetic ID
            artist: knowledgeMatch.artist,
            title: knowledgeMatch.title,
            score: 100,
            source: 'discogs', // effectively it's a valid result, mimicking discogs structure for frontend
            type: 'track', // assumption
            matchDetails: knowledgeMatch,
          },
        ],
        heuristic: {
          artist: primaryCandidate.artist,
          title: primaryCandidate.title,
        },
      };
    }

    // 3. STORAGE & DISCOGS PHASE
    // Execute strategies
    let allResults: MatchResult[] = [];
    let discogsError = false;

    // Filter strategies if we have high confidence from heuristics or specific hints?
    // For now run them as generated.

    try {
      allResults = await this.executeStrategiesAndScore(
        strategies,
        primaryCandidate.artist,
        primaryCandidate.title,
      );
    } catch (e) {
      this.logger.error(`Discogs Search failed: ${e}`);
      discogsError = true;
      // If purely technical error, we might want to flag it.
      // But executeStrategiesAndScore catches individual strategy errors usually.
      // If it bubbled up, it's serious.
    }

    const bestScore = allResults.length > 0 ? allResults[0].score || 0 : 0;

    // 4. DECISION / AI FALLBACK
    // Conditions for AI:
    // 1. Low Heuristic Confidence OR Garbage Detected
    // 2. OR (Results exist but best score is low)
    // 3. AND NO Discogs Technical Errors

    const needsAi =
      confidence < 0.5 ||
      hasGarbage ||
      (allResults.length > 0 && bestScore < this.GOOD_SCORE) ||
      allResults.length === 0;

    // AI Fallback - strictly controlled by frontend flag AND strict necessity
    if (
      needsAi &&
      !discogsError &&
      useAiFallback &&
      this.groqService.isAvailable()
    ) {
      // Cap: Check if we already tried AI? implicit in flow: this is the one AI attempt.
      // We only do this if we haven't passed "aiConfidence" override (which suggests we are already in a retry loop or user driven)
      // Actually user passed aiConfidence might be from a previous AI run?
      // For this strict flow, let's assume this is the main entry.

      // Limit: Only 1 call.
      this.logger.warn(
        `Triggering AI Fallback: Conf=${confidence}, Garbage=${hasGarbage}, BestScore=${bestScore}`,
      );

      try {
        const aiResult = await this.groqService.parseFilename(
          rawFilename,
          primaryCandidate.artist,
          primaryCandidate.title,
          {
            artist: primaryCandidate.artist,
            title: primaryCandidate.title,
            confidence,
          },
        );

        if (aiResult.confidence > 0.5 && aiResult.artist && aiResult.title) {
          this.logger.log(
            `AI suggest: ${aiResult.artist} - ${aiResult.title}. Re-running Discogs strategies.`,
          );

          // Re-generate strategies with AI hints
          // We use the AI output as the "Primary Candidate" for new strategies
          const aiStrategies = this.heuristicService.generateStrategies(
            aiResult.artist,
            aiResult.title,
          );

          // Re-search
          const aiDiscogsResults = await this.executeStrategiesAndScore(
            aiStrategies,
            aiResult.artist,
            aiResult.title,
          );

          // Merge results (preferring AI sourced if score is higher, or just mix)
          // We append and re-sort
          allResults = [...allResults, ...aiDiscogsResults];

          // Re-score all against the AI Candidate? Or keep their score against their own search terms?
          // Usually score is "Match vs Query". If we changed Query (AI), we have new scores.
          // We just sort by raw score.
          allResults.sort((a, b) => (b.score || 0) - (a.score || 0));
        }
      } catch (e) {
        this.logger.error(`AI Fail: ${e}`);
      }
    } else if (discogsError) {
      this.logger.warn(`Skipping AI due to Discogs Technical Error.`);
    }

    // Remove duplicates by creating a unique key (source + id)
    const seen = new Set<string>();
    const uniqueResults = allResults.filter((result) => {
      const key = `${result.source}:${result.id}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });

    return {
      results: uniqueResults,
      heuristic: {
        artist: primaryCandidate.artist,
        title: primaryCandidate.title,
      },
    };
  }

  private async executeStrategiesAndScore(
    strategies: SearchStrategy[],
    targetArtist: string,
    targetTitle: string,
  ): Promise<MatchResult[]> {
    const allResults: MatchResult[] = [];
    const BATCH_SIZE = 3;

    // Cap strategies to avoid excessive API calls
    const strategiesToRun = strategies.slice(0, 10);

    for (let i = 0; i < strategiesToRun.length; i += BATCH_SIZE) {
      const batch = strategiesToRun.slice(i, i + BATCH_SIZE);
      const batchResults = await Promise.all(
        batch.map((s) => this.executeStrategy(s)),
      );

      for (const resList of batchResults) {
        for (const res of resList) {
          if (!allResults.some((r) => r.id === res.id)) {
            res.score = this.matchService.calculateResultScore(
              res,
              targetArtist,
              targetTitle,
            );
            allResults.push(res);
          }
        }
      }

      // Early break check
      allResults.sort((a, b) => (b.score || 0) - (a.score || 0));
      const top = allResults[0]?.score || 0;
      if (top >= this.EXCELLENT_SCORE) break;

      // Rate limit delay
      if (i + BATCH_SIZE < strategiesToRun.length) {
        await new Promise((r) => setTimeout(r, 1100)); // 1.1s delay
      }
    }

    return allResults;
  }

  private async executeStrategy(
    strategy: SearchStrategy,
  ): Promise<MatchResult[]> {
    try {
      if (strategy.source === 'musicbrainz') {
        const results = await this.mbService.searchReleases(
          strategy.artist || '',
          strategy.title || '',
        );
        return results.map((r) => ({ ...r, source: 'musicbrainz', score: 0 }));
      }

      let results: any[] = [];
      // Map 'SearchStrategy' types to Discogs calls
      switch (strategy.type) {
        case 'track':
        case 'split_artist':
        case 'fuzzy':
          // Use searchByTrack for these specific artist+title combos
          results = await this.discogs.searchByTrack(
            strategy.artist || '',
            strategy.title || '',
            strategy.searchType || 'all',
          );
          break;
        case 'query':
        case 'exact':
        case 'title_only':
          // General query search
          results = await this.discogs.searchQuery(
            strategy.query || strategy.title || '',
            strategy.searchType || 'all',
          );
          break;
        case 'release':
          results = await this.discogs.searchRelease(
            strategy.artist || '',
            strategy.title || '',
            strategy.searchType || 'release',
          );
          break;
      }

      return results.map((r) => ({
        ...r,
        source: 'discogs',
        score: 0,
      })) as MatchResult[];
    } catch (e) {
      if (
        e instanceof Error &&
        (e.message.includes('429') || e.message.includes('50'))
      ) {
        throw e; // Bubble up technical errors to stop AI fallback
      }
      return [];
    }
  }

  rankTracks(query: RankTracksDto) {
    // HEURISTIC ENFORCEMENT
    // We strictly prefer the backend's heuristic parsing over the potentially dirty tags
    // sent by the frontend (which might include (A2), dates, etc).
    if (query.filename) {
      const heuristic = this.heuristicService.parse(query.filename);
      // If we got a clean result, use it!
      if (heuristic.primaryCandidate.artist && heuristic.primaryCandidate.title) {
        this.logger.debug(
          `Refining RankTracks Query: "${query.artist} - ${query.title}" -> "${heuristic.primaryCandidate.artist} - ${heuristic.primaryCandidate.title}"`
        );
        query.artist = heuristic.primaryCandidate.artist;
        query.title = heuristic.primaryCandidate.title;
      }
    }
    return this.matchService.rankTracks(query);
  }
}
