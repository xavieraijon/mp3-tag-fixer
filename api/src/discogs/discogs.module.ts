import { Module } from '@nestjs/common';
import { DiscogsController } from './discogs.controller';
import { DiscogsService } from './discogs.service';
import { SearchService } from './search.service';
import { StringUtilsService } from './string-utils.service';

@Module({
  controllers: [DiscogsController],
  providers: [DiscogsService, SearchService, StringUtilsService],
  exports: [DiscogsService, SearchService, StringUtilsService],
})
export class DiscogsModule {}
