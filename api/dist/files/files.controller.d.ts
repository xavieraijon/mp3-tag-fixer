import { StreamableFile } from '@nestjs/common';
import type { Response } from 'express';
import { FilesService, Mp3Tags } from './files.service';
import { WriteTagsDto } from './dto/write-tags.dto';
export declare class FilesController {
    private readonly filesService;
    constructor(filesService: FilesService);
    upload(file: Express.Multer.File, userId: string): Promise<{
        fileId: string;
        originalName: string;
        size: number;
        parsedFilename: import("./files.service").ParsedFilename;
        currentTags: Mp3Tags;
    }>;
    getTags(fileId: string, userId: string): Promise<Mp3Tags>;
    writeTags(fileId: string, dto: WriteTagsDto, userId: string, res: Response): Promise<StreamableFile>;
    writeTagsWithCover(fileId: string, dto: WriteTagsDto, coverFile: Express.Multer.File, userId: string, res: Response): Promise<StreamableFile>;
    deleteFile(fileId: string, userId: string): Promise<{
        success: boolean;
    }>;
}
