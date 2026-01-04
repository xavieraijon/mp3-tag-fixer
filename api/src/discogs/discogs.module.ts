import { Module } from '@nestjs/common';
import { DiscogsController } from './discogs.controller';
import { DiscogsService } from './discogs.service';
import { SearchService } from './search.service';

@Module({
  controllers: [DiscogsController],
  providers: [DiscogsService, SearchService],
  exports: [DiscogsService, SearchService],
})
export class DiscogsModule {}
