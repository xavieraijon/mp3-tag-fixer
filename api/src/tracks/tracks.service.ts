import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTrackDto } from './dto/create-track.dto';
import { UpdateTrackDto } from './dto/update-track.dto';
import { TrackStatus } from '@prisma/client';

@Injectable()
export class TracksService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new track for a user
   */
  async create(userId: string, dto: CreateTrackDto) {
    return this.prisma.track.create({
      data: {
        userId,
        ...dto,
      },
    });
  }

  /**
   * Get all tracks for a user with optional filtering
   */
  async findAllByUser(
    userId: string,
    options?: {
      status?: TrackStatus;
      search?: string;
      skip?: number;
      take?: number;
    },
  ) {
    const where: any = { userId };

    if (options?.status) {
      where.status = options.status;
    }

    if (options?.search) {
      where.OR = [
        { title: { contains: options.search, mode: 'insensitive' } },
        { artist: { contains: options.search, mode: 'insensitive' } },
        { album: { contains: options.search, mode: 'insensitive' } },
        { originalFilename: { contains: options.search, mode: 'insensitive' } },
      ];
    }

    const [tracks, total] = await Promise.all([
      this.prisma.track.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: options?.skip,
        take: options?.take,
      }),
      this.prisma.track.count({ where }),
    ]);

    return { tracks, total };
  }

  /**
   * Get a single track by ID (must belong to user)
   */
  async findOne(userId: string, id: string) {
    const track = await this.prisma.track.findFirst({
      where: { id, userId },
    });

    if (!track) {
      throw new NotFoundException(`Track with ID ${id} not found`);
    }

    return track;
  }

  /**
   * Update a track
   */
  async update(userId: string, id: string, dto: UpdateTrackDto) {
    // First verify the track exists and belongs to user
    await this.findOne(userId, id);

    return this.prisma.track.update({
      where: { id },
      data: dto,
    });
  }

  /**
   * Delete a track
   */
  async remove(userId: string, id: string) {
    // First verify the track exists and belongs to user
    await this.findOne(userId, id);

    return this.prisma.track.delete({
      where: { id },
    });
  }

  /**
   * Mark a track as processed
   */
  async markAsProcessed(userId: string, id: string) {
    await this.findOne(userId, id);

    return this.prisma.track.update({
      where: { id },
      data: {
        status: TrackStatus.DONE,
        processedAt: new Date(),
      },
    });
  }

  /**
   * Find duplicate tracks by file hash
   */
  async findDuplicates(userId: string, fileHash: string) {
    return this.prisma.track.findMany({
      where: {
        userId,
        fileHash,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get user track statistics
   */
  async getStats(userId: string) {
    const [total, byStatus] = await Promise.all([
      this.prisma.track.count({ where: { userId } }),
      this.prisma.track.groupBy({
        by: ['status'],
        where: { userId },
        _count: true,
      }),
    ]);

    const statusCounts: Record<string, number> = {};
    for (const item of byStatus) {
      statusCounts[item.status] = item._count;
    }

    return {
      total,
      byStatus: statusCounts,
    };
  }

  /**
   * Batch create tracks
   */
  async createMany(userId: string, tracks: CreateTrackDto[]) {
    const data = tracks.map((track) => ({
      userId,
      ...track,
    }));

    return this.prisma.track.createMany({
      data,
      skipDuplicates: true,
    });
  }

  /**
   * Batch update status
   */
  async updateManyStatus(userId: string, ids: string[], status: TrackStatus) {
    return this.prisma.track.updateMany({
      where: {
        id: { in: ids },
        userId,
      },
      data: { status },
    });
  }
}
