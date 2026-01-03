import { Module } from '@nestjs/common';
import { CorrectionService } from './correction.service';
import { CorrectionController } from './correction.controller';
import { DiscogsModule } from '../discogs/discogs.module';
import { MusicBrainzModule } from '../musicbrainz/musicbrainz.module';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [DiscogsModule, MusicBrainzModule, AiModule],
  controllers: [CorrectionController],
  providers: [CorrectionService],
})
export class CorrectionModule {}
