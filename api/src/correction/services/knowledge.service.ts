import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TrackStatus } from '@prisma/client';
import { StringUtils } from '../../shared';

export interface KnowledgeMatch {
  artist: string;
  title: string;
  source: 'knowledge-base';
  confidence: number;
  matchType: 'hash' | 'filename' | 'normalized_key';
  originalTrackId: string;
}

@Injectable()
export class KnowledgeService {
  private readonly logger = new Logger(KnowledgeService.name);

  constructor(private readonly prisma: PrismaService) {}

  async findMatch(
    fileHash: string | null,
    filename: string,
    heuristicArtist?: string,
    heuristicTitle?: string,
  ): Promise<KnowledgeMatch | null> {
    // 1. Exact Match by File Hash (Strongest)
    if (fileHash) {
      const hashMatch = await this.prisma.track.findFirst({
        where: {
          fileHash,
          status: TrackStatus.DONE,
          artist: { not: null },
          title: { not: null },
        },
        orderBy: { updatedAt: 'desc' },
      });

      if (hashMatch && hashMatch.artist && hashMatch.title) {
        this.logger.log(`Knowledge Base Hit (Hash): ${filename}`);
        return {
          artist: hashMatch.artist,
          title: hashMatch.title,
          source: 'knowledge-base',
          confidence: 1.0,
          matchType: 'hash',
          originalTrackId: hashMatch.id,
        };
      }
    }

    // 2. Match by Normalized Key (using the new normalizedKey column)
    if (heuristicArtist && heuristicTitle) {
      const normalizedKey = StringUtils.generateNormalizedKey(
        heuristicArtist,
        heuristicTitle,
      );

      if (normalizedKey) {
        const keyMatch = await this.prisma.track.findFirst({
          where: {
            normalizedKey,
            status: TrackStatus.DONE,
            artist: { not: null },
            title: { not: null },
          },
          orderBy: { updatedAt: 'desc' },
        });

        if (keyMatch && keyMatch.artist && keyMatch.title) {
          this.logger.log(`Knowledge Base Hit (NormalizedKey): ${filename}`);
          return {
            artist: keyMatch.artist,
            title: keyMatch.title,
            source: 'knowledge-base',
            confidence: 0.95,
            matchType: 'normalized_key',
            originalTrackId: keyMatch.id,
          };
        }
      }
    }

    // 3. Exact Match by Original Filename (Fallback)
    const filenameMatch = await this.prisma.track.findFirst({
      where: {
        originalFilename: filename,
        status: TrackStatus.DONE,
        artist: { not: null },
        title: { not: null },
      },
      orderBy: { updatedAt: 'desc' },
    });

    if (filenameMatch && filenameMatch.artist && filenameMatch.title) {
      this.logger.log(`Knowledge Base Hit (OriginalFilename): ${filename}`);
      return {
        artist: filenameMatch.artist,
        title: filenameMatch.title,
        source: 'knowledge-base',
        confidence: 0.9,
        matchType: 'filename',
        originalTrackId: filenameMatch.id,
      };
    }

    return null;
  }
}
