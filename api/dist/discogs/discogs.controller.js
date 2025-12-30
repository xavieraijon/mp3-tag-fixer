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
exports.DiscogsController = void 0;
const common_1 = require("@nestjs/common");
const discogs_service_1 = require("./discogs.service");
const search_service_1 = require("./search.service");
const search_dto_1 = require("./dto/search.dto");
const public_decorator_1 = require("../auth/decorators/public.decorator");
let DiscogsController = class DiscogsController {
    discogsService;
    searchService;
    constructor(discogsService, searchService) {
        this.discogsService = discogsService;
        this.searchService = searchService;
    }
    async smartSearch(dto) {
        if (!dto.artist && !dto.title) {
            throw new common_1.BadRequestException('Artist or title is required');
        }
        const results = await this.searchService.search(dto.artist || '', dto.title || '');
        return { results, count: results.length };
    }
    async searchRelease(dto) {
        const results = await this.discogsService.searchRelease(dto.artist || '', dto.release || '', dto.type || 'master');
        return { results, count: results.length };
    }
    async searchByTrack(dto) {
        if (!dto.track) {
            throw new common_1.BadRequestException('Track name is required');
        }
        const results = await this.discogsService.searchByTrack(dto.artist || '', dto.track, dto.type || 'all');
        return { results, count: results.length };
    }
    async searchQuery(dto) {
        if (!dto.q) {
            throw new common_1.BadRequestException('Query is required');
        }
        const results = await this.discogsService.searchQuery(dto.q, dto.type || 'all');
        return { results, count: results.length };
    }
    async getReleaseDetails(id, type) {
        const releaseId = parseInt(id, 10);
        if (isNaN(releaseId)) {
            throw new common_1.BadRequestException('Invalid release ID');
        }
        const details = await this.discogsService.getReleaseDetails(releaseId, type || 'release');
        if (!details) {
            throw new common_1.BadRequestException('Release not found');
        }
        return details;
    }
    async getMasterDetails(id) {
        const masterId = parseInt(id, 10);
        if (isNaN(masterId)) {
            throw new common_1.BadRequestException('Invalid master ID');
        }
        const details = await this.discogsService.getReleaseDetails(masterId, 'master');
        if (!details) {
            throw new common_1.BadRequestException('Master not found');
        }
        return details;
    }
    async getCoverImage(imageUrl, res) {
        if (!imageUrl) {
            throw new common_1.BadRequestException('Image URL is required');
        }
        const buffer = await this.discogsService.fetchCoverImage(imageUrl);
        if (!buffer) {
            throw new common_1.BadRequestException('Could not fetch image');
        }
        res.set({
            'Content-Type': 'image/jpeg',
            'Content-Length': buffer.length,
            'Cache-Control': 'public, max-age=86400',
        });
        return new common_1.StreamableFile(buffer);
    }
};
exports.DiscogsController = DiscogsController;
__decorate([
    (0, common_1.Get)('search/smart'),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [search_dto_1.SmartSearchDto]),
    __metadata("design:returntype", Promise)
], DiscogsController.prototype, "smartSearch", null);
__decorate([
    (0, common_1.Get)('search/release'),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [search_dto_1.SearchReleaseDto]),
    __metadata("design:returntype", Promise)
], DiscogsController.prototype, "searchRelease", null);
__decorate([
    (0, common_1.Get)('search/track'),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [search_dto_1.SearchTrackDto]),
    __metadata("design:returntype", Promise)
], DiscogsController.prototype, "searchByTrack", null);
__decorate([
    (0, common_1.Get)('search'),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [search_dto_1.SearchQueryDto]),
    __metadata("design:returntype", Promise)
], DiscogsController.prototype, "searchQuery", null);
__decorate([
    (0, common_1.Get)('release/:id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Query)('type')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], DiscogsController.prototype, "getReleaseDetails", null);
__decorate([
    (0, common_1.Get)('master/:id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], DiscogsController.prototype, "getMasterDetails", null);
__decorate([
    (0, common_1.Get)('image'),
    __param(0, (0, common_1.Query)('url')),
    __param(1, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], DiscogsController.prototype, "getCoverImage", null);
exports.DiscogsController = DiscogsController = __decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Controller)('discogs'),
    __metadata("design:paramtypes", [discogs_service_1.DiscogsService,
        search_service_1.SearchService])
], DiscogsController);
//# sourceMappingURL=discogs.controller.js.map