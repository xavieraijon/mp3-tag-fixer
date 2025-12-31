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
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UserId } from '../auth/decorators/user-id.decorator';
import { TrackStatus } from '@prisma/client';

@Controller('tracks')
@UseGuards(JwtAuthGuard)
export class TracksController {
  constructor(private readonly tracksService: TracksService) {}

  /**
   * Create a new track
   */
  @Post()
  async create(@UserId() userId: string, @Body() dto: CreateTrackDto) {
    return this.tracksService.create(userId, dto);
  }

  /**
   * Create multiple tracks at once
   */
  @Post('batch')
  async createMany(@UserId() userId: string, @Body() tracks: CreateTrackDto[]) {
    return this.tracksService.createMany(userId, tracks);
  }

  /**
   * Get all tracks for the current user
   */
  @Get()
  async findAll(
    @UserId() userId: string,
    @Query('status') status?: TrackStatus,
    @Query('search') search?: string,
    @Query('skip', new DefaultValuePipe(0), ParseIntPipe) skip?: number,
    @Query('take', new DefaultValuePipe(50), ParseIntPipe) take?: number,
  ) {
    return this.tracksService.findAllByUser(userId, { status, search, skip, take });
  }

  /**
   * Get track statistics
   */
  @Get('stats')
  async getStats(@UserId() userId: string) {
    return this.tracksService.getStats(userId);
  }

  /**
   * Check for duplicates by file hash
   */
  @Get('duplicates/:fileHash')
  async findDuplicates(@UserId() userId: string, @Param('fileHash') fileHash: string) {
    const duplicates = await this.tracksService.findDuplicates(userId, fileHash);
    return { duplicates, count: duplicates.length };
  }

  /**
   * Get a single track
   */
  @Get(':id')
  async findOne(@UserId() userId: string, @Param('id') id: string) {
    return this.tracksService.findOne(userId, id);
  }

  /**
   * Update a track
   */
  @Patch(':id')
  async update(
    @UserId() userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateTrackDto,
  ) {
    return this.tracksService.update(userId, id, dto);
  }

  /**
   * Mark a track as processed
   */
  @Patch(':id/mark-processed')
  async markAsProcessed(@UserId() userId: string, @Param('id') id: string) {
    return this.tracksService.markAsProcessed(userId, id);
  }

  /**
   * Batch update status for multiple tracks
   */
  @Patch('batch/status')
  async updateManyStatus(
    @UserId() userId: string,
    @Body() body: { ids: string[]; status: TrackStatus },
  ) {
    return this.tracksService.updateManyStatus(userId, body.ids, body.status);
  }

  /**
   * Delete a track
   */
  @Delete(':id')
  async remove(@UserId() userId: string, @Param('id') id: string) {
    return this.tracksService.remove(userId, id);
  }
}
