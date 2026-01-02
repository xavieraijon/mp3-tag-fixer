import { Controller, Post, Get, Param, BadRequestException, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AcoustidService, IdentifyResult } from './acoustid.service';
import { uploadedFiles } from '../../files/files.controller';
import { Public } from '../../auth/decorators/public.decorator';

@Controller('ai')
export class AcoustidController {
  constructor(private readonly acoustidService: AcoustidService) {}

  /**
   * Check if AcoustID service is available
   */
  @Public()
  @Get('acoustid/status')
  getStatus(): { available: boolean; provider: string } {
    return {
      available: this.acoustidService.isAvailable(),
      provider: 'acoustid',
    };
  }

  /**
   * Identify a track by its audio fingerprint (using fileId from previous upload)
   */
  @Public()
  @Post('identify/:fileId')
  async identifyTrack(@Param('fileId') fileId: string): Promise<IdentifyResult | { error: string }> {
    // Get file from memory
    const file = uploadedFiles.get(fileId);

    if (!file) {
      throw new BadRequestException('File not found or expired. Please upload the file first.');
    }

    if (!this.acoustidService.isAvailable()) {
      return { error: 'AcoustID service not available. Check ACOUSTID_API_KEY configuration.' };
    }

    const result = await this.acoustidService.identifyFromBuffer(file.buffer);

    if (!result) {
      return { error: 'Could not identify track. Audio fingerprint not found in database.' };
    }

    return result;
  }

  /**
   * Identify a track by uploading the file directly (no auth required)
   * This is the preferred method for AcoustID identification
   */
  @Public()
  @Post('identify')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 50 * 1024 * 1024 }, // 50MB max
      fileFilter: (req, file, cb) => {
        if (!file.mimetype.includes('audio') && !file.originalname.endsWith('.mp3')) {
          cb(new BadRequestException('Only audio files are allowed'), false);
        } else {
          cb(null, true);
        }
      },
    }),
  )
  async identifyFile(@UploadedFile() file: Express.Multer.File): Promise<IdentifyResult | { error: string }> {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    if (!this.acoustidService.isAvailable()) {
      return { error: 'AcoustID service not available. Check ACOUSTID_API_KEY configuration.' };
    }

    const result = await this.acoustidService.identifyFromBuffer(file.buffer);

    if (!result) {
      return { error: 'Could not identify track. Audio fingerprint not found in database.' };
    }

    return result;
  }
}
