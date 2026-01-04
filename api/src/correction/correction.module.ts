import { Module } from '@nestjs/common';
import { CorrectionService } from './correction.service';
import { CorrectionController } from './correction.controller';
import { DiscogsModule } from '../discogs/discogs.module';
import { MusicBrainzModule } from '../musicbrainz/musicbrainz.module';
import { AiModule } from '../ai/ai.module';
import { HeuristicParserService } from './services/heuristic-parser.service';
import { DiscogsMatchService } from './services/discogs-match.service';
import { KnowledgeService } from './services/knowledge.service';

@Module({
  imports: [DiscogsModule, MusicBrainzModule, AiModule],
  controllers: [CorrectionController],
  providers: [
    CorrectionService,
    HeuristicParserService,
    DiscogsMatchService,
    KnowledgeService,
  ],
})
export class CorrectionModule {}
