import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
  Res,
  StreamableFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { FilesService, Mp3Tags } from './files.service';
import { WriteTagsDto } from './dto/write-tags.dto';
import { UserId } from '../auth/decorators/user-id.decorator';
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

// In-memory storage for uploaded files (per session)
// Exported for use by other modules (e.g., AcoustID identification)
export const uploadedFiles = new Map<
  string,
  { buffer: Buffer; originalName: string; userId: string }
>();

@Controller('files')
@UseGuards(JwtAuthGuard)
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  /**
   * Upload an MP3 file and read its tags
   */
  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 50 * 1024 * 1024 }, // 50MB max
      fileFilter: (req, file, cb) => {
        if (
          !file.mimetype.includes('audio') &&
          !file.originalname.endsWith('.mp3')
        ) {
          cb(new BadRequestException('Only MP3 files are allowed'), false);
        } else {
          cb(null, true);
        }
      },
    }),
  )
  async upload(
    @UploadedFile() file: Express.Multer.File,
    @UserId() userId: string,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    // Read existing tags
    const tags = await this.filesService.readTags(file.buffer);

    // Parse filename for artist/title if not in tags
    const parsed = this.filesService.parseFilename(file.originalname);

    // Generate unique ID for this upload
    const fileId = `${userId}-${Date.now()}`;

    // Store in memory (for processing)
    uploadedFiles.set(fileId, {
      buffer: file.buffer,
      originalName: file.originalname,
      userId: userId,
    });

    // Auto-cleanup after 30 minutes
    setTimeout(() => uploadedFiles.delete(fileId), 30 * 60 * 1000);

    return {
      fileId,
      originalName: file.originalname,
      size: file.size,
      parsedFilename: parsed,
      currentTags: tags,
    };
  }

  /**
   * Get tags from an uploaded file
   */
  @Get(':fileId/tags')
  async getTags(@Param('fileId') fileId: string, @UserId() userId: string) {
    const file = uploadedFiles.get(fileId);

    if (!file || file.userId !== userId) {
      throw new BadRequestException('File not found or expired');
    }

    const tags = await this.filesService.readTags(file.buffer);
    return tags;
  }

  /**
   * Write tags to file and return for download
   */
  @Post(':fileId/write-tags')
  async writeTags(
    @Param('fileId') fileId: string,
    @Body() dto: WriteTagsDto,
    @UserId() userId: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const file = uploadedFiles.get(fileId);

    if (!file || file.userId !== userId) {
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

    return new StreamableFile(taggedBuffer);
  }

  /**
   * Write tags with cover image
   */
  @Post(':fileId/write-tags-with-cover')
  @UseInterceptors(FileInterceptor('cover'))
  async writeTagsWithCover(
    @Param('fileId') fileId: string,
    @Body() dto: WriteTagsDto,
    @UploadedFile() coverFile: Express.Multer.File,
    @UserId() userId: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const file = uploadedFiles.get(fileId);

    if (!file || file.userId !== userId) {
      throw new BadRequestException('File not found or expired');
    }

    // Build tags object with cover
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
      image: coverFile?.buffer,
    };

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

    return new StreamableFile(taggedBuffer);
  }

  /**
   * Delete an uploaded file from memory
   */
  @Delete(':fileId')
  async deleteFile(@Param('fileId') fileId: string, @UserId() userId: string) {
    const file = uploadedFiles.get(fileId);

    if (!file || file.userId !== userId) {
      throw new BadRequestException('File not found');
    }

    uploadedFiles.delete(fileId);
    return { success: true };
  }
}
