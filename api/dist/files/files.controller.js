"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FilesController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const files_service_1 = require("./files.service");
const write_tags_dto_1 = require("./dto/write-tags.dto");
const current_user_decorator_1 = require("../auth/decorators/current-user.decorator");
const uploadedFiles = new Map();
let FilesController = class FilesController {
    filesService;
    constructor(filesService) {
        this.filesService = filesService;
    }
    async upload(file, user) {
        if (!file) {
            throw new common_1.BadRequestException('No file uploaded');
        }
        const tags = await this.filesService.readTags(file.buffer);
        const parsed = this.filesService.parseFilename(file.originalname);
        const fileId = `${user.id}-${Date.now()}`;
        uploadedFiles.set(fileId, {
            buffer: file.buffer,
            originalName: file.originalname,
            userId: user.id,
        });
        setTimeout(() => uploadedFiles.delete(fileId), 30 * 60 * 1000);
        return {
            fileId,
            originalName: file.originalname,
            size: file.size,
            parsedFilename: parsed,
            currentTags: tags,
        };
    }
    async getTags(fileId, user) {
        const file = uploadedFiles.get(fileId);
        if (!file || file.userId !== user.id) {
            throw new common_1.BadRequestException('File not found or expired');
        }
        const tags = await this.filesService.readTags(file.buffer);
        return tags;
    }
    async writeTags(fileId, dto, user, res) {
        const file = uploadedFiles.get(fileId);
        if (!file || file.userId !== user.id) {
            throw new common_1.BadRequestException('File not found or expired');
        }
        const tags = {
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
        const taggedBuffer = await this.filesService.writeTags(file.buffer, tags);
        const filename = this.filesService.sanitizeFilename(dto.artist || '', dto.title || file.originalName.replace('.mp3', ''));
        res.set({
            'Content-Type': 'audio/mpeg',
            'Content-Disposition': `attachment; filename="${filename}.mp3"`,
            'Content-Length': taggedBuffer.length,
        });
        return new common_1.StreamableFile(taggedBuffer);
    }
    async writeTagsWithCover(fileId, dto, coverFile, user, res) {
        const file = uploadedFiles.get(fileId);
        if (!file || file.userId !== user.id) {
            throw new common_1.BadRequestException('File not found or expired');
        }
        const tags = {
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
        const taggedBuffer = await this.filesService.writeTags(file.buffer, tags);
        const filename = this.filesService.sanitizeFilename(dto.artist || '', dto.title || file.originalName.replace('.mp3', ''));
        res.set({
            'Content-Type': 'audio/mpeg',
            'Content-Disposition': `attachment; filename="${filename}.mp3"`,
            'Content-Length': taggedBuffer.length,
        });
        return new common_1.StreamableFile(taggedBuffer);
    }
    async deleteFile(fileId, user) {
        const file = uploadedFiles.get(fileId);
        if (!file || file.userId !== user.id) {
            throw new common_1.BadRequestException('File not found');
        }
        uploadedFiles.delete(fileId);
        return { success: true };
    }
};
exports.FilesController = FilesController;
__decorate([
    (0, common_1.Post)('upload'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file', {
        limits: { fileSize: 50 * 1024 * 1024 },
        fileFilter: (req, file, cb) => {
            if (!file.mimetype.includes('audio') && !file.originalname.endsWith('.mp3')) {
                cb(new common_1.BadRequestException('Only MP3 files are allowed'), false);
            }
            else {
                cb(null, true);
            }
        },
    })),
    __param(0, (0, common_1.UploadedFile)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], FilesController.prototype, "upload", null);
__decorate([
    (0, common_1.Get)(':fileId/tags'),
    __param(0, (0, common_1.Param)('fileId')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], FilesController.prototype, "getTags", null);
__decorate([
    (0, common_1.Post)(':fileId/write-tags'),
    __param(0, (0, common_1.Param)('fileId')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __param(3, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, write_tags_dto_1.WriteTagsDto, Object, Object]),
    __metadata("design:returntype", Promise)
], FilesController.prototype, "writeTags", null);
__decorate([
    (0, common_1.Post)(':fileId/write-tags-with-cover'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('cover')),
    __param(0, (0, common_1.Param)('fileId')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.UploadedFile)()),
    __param(3, (0, current_user_decorator_1.CurrentUser)()),
    __param(4, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, write_tags_dto_1.WriteTagsDto, Object, Object, Object]),
    __metadata("design:returntype", Promise)
], FilesController.prototype, "writeTagsWithCover", null);
__decorate([
    (0, common_1.Delete)(':fileId'),
    __param(0, (0, common_1.Param)('fileId')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], FilesController.prototype, "deleteFile", null);
exports.FilesController = FilesController = __decorate([
    (0, common_1.Controller)('files'),
    __metadata("design:paramtypes", [files_service_1.FilesService])
], FilesController);
//# sourceMappingURL=files.controller.js.map