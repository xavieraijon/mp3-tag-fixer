import { StreamableFile } from '@nestjs/common';
import type { Response } from 'express';
import { FilesService, Mp3Tags } from './files.service';
import { WriteTagsDto } from './dto/write-tags.dto';
import type { ClerkUser } from '../auth/clerk.service';
export declare class FilesController {
    private readonly filesService;
    constructor(filesService: FilesService);
    upload(file: Express.Multer.File, user: ClerkUser): Promise<{
        fileId: string;
        originalName: string;
        size: number;
        parsedFilename: import("./files.service").ParsedFilename;
        currentTags: Mp3Tags;
    }>;
    getTags(fileId: string, user: ClerkUser): Promise<Mp3Tags>;
    writeTags(fileId: string, dto: WriteTagsDto, user: ClerkUser, res: Response): Promise<StreamableFile>;
    writeTagsWithCover(fileId: string, dto: WriteTagsDto, coverFile: Express.Multer.File, user: ClerkUser, res: Response): Promise<StreamableFile>;
    deleteFile(fileId: string, user: ClerkUser): Promise<{
        success: boolean;
    }>;
}
