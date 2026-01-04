import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { SharedModule } from './shared/shared.module';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { FilesModule } from './files/files.module';
import { DiscogsModule } from './discogs/discogs.module';
import { TracksModule } from './tracks/tracks.module';
import { PaymentsModule } from './payments/payments.module';
import { AiModule } from './ai/ai.module';
import { MusicBrainzModule } from './musicbrainz/musicbrainz.module';
import { YoutubeModule } from './youtube/youtube.module';
import { CorrectionModule } from './correction/correction.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    SharedModule, // Global module - provides StringUtilsService
    PrismaModule,
    AuthModule,
    UsersModule,
    FilesModule,
    DiscogsModule,
    TracksModule,
    PaymentsModule,
    AiModule,
    MusicBrainzModule,
    YoutubeModule,
    CorrectionModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
