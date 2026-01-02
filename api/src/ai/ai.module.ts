import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { GroqService } from './groq/groq.service';
import { GroqController } from './groq/groq.controller';
import { AcoustidService } from './acoustid/acoustid.service';
import { AcoustidController } from './acoustid/acoustid.controller';

@Module({
  imports: [ConfigModule],
  controllers: [GroqController, AcoustidController],
  providers: [GroqService, AcoustidService],
  exports: [GroqService, AcoustidService],
})
export class AiModule {}
