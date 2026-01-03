import { Controller, Post, Body, Get } from '@nestjs/common';
import { GroqService } from './groq.service';
import {
  ParseFilenameDto,
  ParseFilenameResponse,
} from '../dto/parse-filename.dto';
import { Public } from '../../auth/decorators/public.decorator';

@Controller('ai')
export class GroqController {
  constructor(private readonly groqService: GroqService) {}

  /**
   * Check if AI parsing is available
   */
  @Public()
  @Get('status')
  getStatus(): { available: boolean; provider: string } {
    return {
      available: this.groqService.isAvailable(),
      provider: 'groq',
    };
  }

  /**
   * Parse a filename using Groq LLM to extract artist and title
   */
  @Public()
  @Post('parse-filename')
  async parseFilename(
    @Body() dto: ParseFilenameDto,
  ): Promise<ParseFilenameResponse> {
    return this.groqService.parseFilename(
      dto.filename,
      dto.existingArtist,
      dto.existingTitle,
    );
  }
}
