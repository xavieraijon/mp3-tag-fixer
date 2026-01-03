import {
  Controller,
  Get,
  Query,
  Param,
  Res,
  BadRequestException,
  StreamableFile,
} from '@nestjs/common';
import type { Response } from 'express';
import { DiscogsService } from './discogs.service';
import { SearchService } from './search.service';
import {
  SearchReleaseDto,
  SearchTrackDto,
  SearchQueryDto,
  SmartSearchDto,
} from './dto/search.dto';
import { Public } from '../auth/decorators/public.decorator';

@Public() // All Discogs endpoints are public for now
@Controller('discogs')
export class DiscogsController {
  constructor(
    private readonly discogsService: DiscogsService,
    private readonly searchService: SearchService,
  ) {}

  /**
   * Smart multi-strategy search (main search endpoint)
   */
  @Get('search/smart')
  async smartSearch(@Query() dto: SmartSearchDto) {
    if (!dto.artist && !dto.title) {
      throw new BadRequestException('Artist or title is required');
    }
    const results = await this.searchService.search(
      dto.artist || '',
      dto.title || '',
    );
    return { results, count: results.length };
  }

  /**
   * Search by artist and release title
   */
  @Get('search/release')
  async searchRelease(@Query() dto: SearchReleaseDto) {
    const results = await this.discogsService.searchRelease(
      dto.artist || '',
      dto.release || '',
      dto.type || 'master',
    );
    return { results, count: results.length };
  }

  /**
   * Search by track name
   */
  @Get('search/track')
  async searchByTrack(@Query() dto: SearchTrackDto) {
    if (!dto.track) {
      throw new BadRequestException('Track name is required');
    }
    const results = await this.discogsService.searchByTrack(
      dto.artist || '',
      dto.track,
      dto.type || 'all',
    );
    return { results, count: results.length };
  }

  /**
   * General query search
   */
  @Get('search')
  async searchQuery(@Query() dto: SearchQueryDto) {
    if (!dto.q) {
      throw new BadRequestException('Query is required');
    }
    const results = await this.discogsService.searchQuery(
      dto.q,
      dto.type || 'all',
    );
    return { results, count: results.length };
  }

  /**
   * Get release details
   */
  @Get('release/:id')
  async getReleaseDetails(
    @Param('id') id: string,
    @Query('type') type?: 'release' | 'master',
  ) {
    const releaseId = parseInt(id, 10);
    if (isNaN(releaseId)) {
      throw new BadRequestException('Invalid release ID');
    }

    const details = await this.discogsService.getReleaseDetails(
      releaseId,
      type || 'release',
    );

    if (!details) {
      throw new BadRequestException('Release not found');
    }

    return details;
  }

  /**
   * Get master details
   */
  @Get('master/:id')
  async getMasterDetails(@Param('id') id: string) {
    const masterId = parseInt(id, 10);
    if (isNaN(masterId)) {
      throw new BadRequestException('Invalid master ID');
    }

    const details = await this.discogsService.getReleaseDetails(
      masterId,
      'master',
    );

    if (!details) {
      throw new BadRequestException('Master not found');
    }

    return details;
  }

  /**
   * Proxy cover image (bypasses CORS)
   */
  @Get('image')
  async getCoverImage(
    @Query('url') imageUrl: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    if (!imageUrl) {
      throw new BadRequestException('Image URL is required');
    }

    const buffer = await this.discogsService.fetchCoverImage(imageUrl);

    if (!buffer) {
      throw new BadRequestException('Could not fetch image');
    }

    res.set({
      'Content-Type': 'image/jpeg',
      'Content-Length': buffer.length,
      'Cache-Control': 'public, max-age=86400',
    });

    return new StreamableFile(buffer);
  }
}
