import { Controller, Post, Body, Logger } from '@nestjs/common';
import { YoutubeService } from './youtube.service';
import { YoutubeDownloadDto } from './dto/youtube-download.dto';
import { FilesService } from '../files/files.service';
import { uploadedFiles } from '../files/files.controller';
import { Public } from '../auth/decorators/public.decorator';

@Controller('youtube')
export class YoutubeController {
  private readonly logger = new Logger(YoutubeController.name);

  constructor(
    private readonly youtubeService: YoutubeService,
    private readonly filesService: FilesService,
  ) {}

  /**
   * Download audio from YouTube URL and prepare for tag editing
   * Returns same format as /api/files/upload for seamless integration
   */
  @Public()
  @Post('download')
  async download(@Body() dto: YoutubeDownloadDto) {
    // Use 'anonymous' for unauthenticated users
    const userId = 'anonymous';
    this.logger.log(
      `[YoutubeController] Download request: ${dto.url}`,
    );

    // Download audio from YouTube
    const result = await this.youtubeService.downloadAudio(dto.url);

    // Read tags from the downloaded file (will be mostly empty for YouTube downloads)
    const tags = await this.filesService.readTags(result.buffer);

    // Parse the generated filename for artist/title
    const parsed = this.filesService.parseFilename(result.filename);

    // Pre-populate with YouTube metadata if not in tags
    if (!parsed.artist && result.info.channel) {
      parsed.artist = result.info.channel;
    }
    if (!parsed.title && result.info.title) {
      parsed.title = result.info.title;
    }

    // Generate unique ID for this upload
    const fileId = `${userId}-yt-${Date.now()}`;

    // Store in memory (same as regular file upload)
    uploadedFiles.set(fileId, {
      buffer: result.buffer,
      originalName: result.filename,
      userId: userId,
    });

    // Auto-cleanup after 30 minutes
    setTimeout(() => uploadedFiles.delete(fileId), 30 * 60 * 1000);

    this.logger.log(`[YoutubeController] File stored with ID: ${fileId}`);

    return {
      fileId,
      originalName: result.filename,
      size: result.buffer.length,
      parsedFilename: parsed,
      currentTags: {
        ...tags,
        // Inject YouTube metadata as initial values
        title: tags.title || result.info.title,
        artist: tags.artist || result.info.channel,
        duration: result.info.duration,
      },
      youtubeInfo: {
        title: result.info.title,
        channel: result.info.channel,
        duration: result.info.duration,
        thumbnail: result.info.thumbnail,
      },
    };
  }
}
