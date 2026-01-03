import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MusicBrainzController } from './musicbrainz.controller';
import { MusicBrainzService } from './musicbrainz.service';

@Module({
  imports: [ConfigModule],
  controllers: [MusicBrainzController],
  providers: [MusicBrainzService],
  exports: [MusicBrainzService],
})
export class MusicBrainzModule {}
