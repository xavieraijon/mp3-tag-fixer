import { Controller, Post, Body, Logger, Param, Res, StreamableFile, BadRequestException } from '@nestjs/common';
import type { Response } from 'express';
import { YoutubeService } from './youtube.service';
import { YoutubeDownloadDto } from './dto/youtube-download.dto';
import { FilesService, Mp3Tags } from '../files/files.service';
import { uploadedFiles } from '../files/files.controller';
import { Public } from '../auth/decorators/public.decorator';
import { WriteTagsDto } from '../files/dto/write-tags.dto';

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
    this.logger.log(`[YoutubeController] Download request: ${dto.url}`);

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

  /**
   * Write tags to YouTube file and return for download
   * Public endpoint for anonymous YouTube downloads
   */
  @Public()
  @Post(':fileId/write-tags')
  async writeTags(
    @Param('fileId') fileId: string,
    @Body() dto: WriteTagsDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const file = uploadedFiles.get(fileId);

    // Only allow anonymous YouTube files
    if (!file || !fileId.startsWith('anonymous-yt-')) {
      throw new BadRequestException('File not found or expired');
    }

    // Build tags object
    const tags: Mp3Tags = {
      title: dto.title,
      artist: dto.artist,
      album: dto.album,
      year: dto.year,
      genre: dto.genre,
      trackNumber: dto.trackNumber,
      bpm: dto.bpm,
      label: dto.label,
      albumArtist: dto.albumArtist,
      composer: dto.composer,
      comment: dto.comment,
    };

    // Fetch cover image if URL provided
    if (dto.coverImageUrl) {
      try {
        const imageResponse = await fetch(dto.coverImageUrl);
        if (imageResponse.ok) {
          const arrayBuffer = await imageResponse.arrayBuffer();
          tags.image = Buffer.from(arrayBuffer);
          this.logger.log(`[YoutubeController] Cover image fetched: ${tags.image.length} bytes`);
        }
      } catch (error) {
        this.logger.warn(`[YoutubeController] Failed to fetch cover image: ${dto.coverImageUrl}`);
      }
    }

    this.logger.log(`[YoutubeController] Writing tags for ${fileId}: ${dto.artist} - ${dto.title}`);

    // Write tags to buffer
    const taggedBuffer = await this.filesService.writeTags(file.buffer, tags);

    // Generate filename
    const filename = this.filesService.sanitizeFilename(
      dto.artist || '',
      dto.title || file.originalName.replace('.mp3', ''),
    );

    // Set response headers for download
    res.set({
      'Content-Type': 'audio/mpeg',
      'Content-Disposition': `attachment; filename="${filename}.mp3"`,
      'Content-Length': taggedBuffer.length,
    });

    // Clean up
    uploadedFiles.delete(fileId);

    return new StreamableFile(taggedBuffer);
  }
}
