import { Controller, Get, Query, Param } from '@nestjs/common';
import { MusicBrainzService } from './musicbrainz.service';
import { Public } from '../auth/decorators/public.decorator';

@Public()
@Controller('musicbrainz')
export class MusicBrainzController {
  constructor(private readonly service: MusicBrainzService) {}

  @Get('search')
  async search(@Query('artist') artist: string, @Query('title') title: string) {
    return this.service.searchReleases(artist, title);
  }

  @Get('release/:id')
  async getRelease(@Param('id') id: string) {
    return this.service.getReleaseById(id);
  }
}
