import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { TracksService } from './tracks.service';
import { CreateTrackDto } from './dto/create-track.dto';
import { UpdateTrackDto } from './dto/update-track.dto';
import { ClerkAuthGuard } from '../auth/guards/clerk-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { TrackStatus } from '@prisma/client';
import type { ClerkUser } from '../auth/clerk.service';

@Controller('tracks')
@UseGuards(ClerkAuthGuard)
export class TracksController {
  constructor(private readonly tracksService: TracksService) {}

  /**
   * Create a new track
   */
  @Post()
  async create(@CurrentUser() user: ClerkUser, @Body() dto: CreateTrackDto) {
    return this.tracksService.create(user.id, dto);
  }

  /**
   * Create multiple tracks at once
   */
  @Post('batch')
  async createMany(@CurrentUser() user: ClerkUser, @Body() tracks: CreateTrackDto[]) {
    return this.tracksService.createMany(user.id, tracks);
  }

  /**
   * Get all tracks for the current user
   */
  @Get()
  async findAll(
    @CurrentUser() user: ClerkUser,
    @Query('status') status?: TrackStatus,
    @Query('search') search?: string,
    @Query('skip', new DefaultValuePipe(0), ParseIntPipe) skip?: number,
    @Query('take', new DefaultValuePipe(50), ParseIntPipe) take?: number,
  ) {
    return this.tracksService.findAllByUser(user.id, { status, search, skip, take });
  }

  /**
   * Get track statistics
   */
  @Get('stats')
  async getStats(@CurrentUser() user: ClerkUser) {
    return this.tracksService.getStats(user.id);
  }

  /**
   * Check for duplicates by file hash
   */
  @Get('duplicates/:fileHash')
  async findDuplicates(@CurrentUser() user: ClerkUser, @Param('fileHash') fileHash: string) {
    const duplicates = await this.tracksService.findDuplicates(user.id, fileHash);
    return { duplicates, count: duplicates.length };
  }

  /**
   * Get a single track
   */
  @Get(':id')
  async findOne(@CurrentUser() user: ClerkUser, @Param('id') id: string) {
    return this.tracksService.findOne(user.id, id);
  }

  /**
   * Update a track
   */
  @Patch(':id')
  async update(
    @CurrentUser() user: ClerkUser,
    @Param('id') id: string,
    @Body() dto: UpdateTrackDto,
  ) {
    return this.tracksService.update(user.id, id, dto);
  }

  /**
   * Mark a track as processed
   */
  @Patch(':id/mark-processed')
  async markAsProcessed(@CurrentUser() user: ClerkUser, @Param('id') id: string) {
    return this.tracksService.markAsProcessed(user.id, id);
  }

  /**
   * Batch update status for multiple tracks
   */
  @Patch('batch/status')
  async updateManyStatus(
    @CurrentUser() user: ClerkUser,
    @Body() body: { ids: string[]; status: TrackStatus },
  ) {
    return this.tracksService.updateManyStatus(user.id, body.ids, body.status);
  }

  /**
   * Delete a track
   */
  @Delete(':id')
  async remove(@CurrentUser() user: ClerkUser, @Param('id') id: string) {
    return this.tracksService.remove(user.id, id);
  }
}
