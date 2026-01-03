import { Controller, Post, Body } from '@nestjs/common';
import { CorrectionService } from './correction.service';
import { SearchQueryDto } from './dto/search-query.dto';
import { Public } from '../auth/decorators/public.decorator';

import { RankTracksDto } from './dto/rank-tracks.dto';

@Controller('correction')
export class CorrectionController {
  constructor(private readonly correctionService: CorrectionService) {}

  @Public()
  @Post('search')
  async search(@Body() query: SearchQueryDto) {
    return this.correctionService.findMatches(query);
  }

  @Public()
  @Post('rank-tracks')
  rankTracks(@Body() query: RankTracksDto) {
    return this.correctionService.rankTracks(query);
  }
}
