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
exports.TracksController = void 0;
const common_1 = require("@nestjs/common");
const tracks_service_1 = require("./tracks.service");
const create_track_dto_1 = require("./dto/create-track.dto");
const update_track_dto_1 = require("./dto/update-track.dto");
const clerk_auth_guard_1 = require("../auth/guards/clerk-auth.guard");
const current_user_decorator_1 = require("../auth/decorators/current-user.decorator");
const client_1 = require("@prisma/client");
let TracksController = class TracksController {
    tracksService;
    constructor(tracksService) {
        this.tracksService = tracksService;
    }
    async create(user, dto) {
        return this.tracksService.create(user.id, dto);
    }
    async createMany(user, tracks) {
        return this.tracksService.createMany(user.id, tracks);
    }
    async findAll(user, status, search, skip, take) {
        return this.tracksService.findAllByUser(user.id, { status, search, skip, take });
    }
    async getStats(user) {
        return this.tracksService.getStats(user.id);
    }
    async findDuplicates(user, fileHash) {
        const duplicates = await this.tracksService.findDuplicates(user.id, fileHash);
        return { duplicates, count: duplicates.length };
    }
    async findOne(user, id) {
        return this.tracksService.findOne(user.id, id);
    }
    async update(user, id, dto) {
        return this.tracksService.update(user.id, id, dto);
    }
    async markAsProcessed(user, id) {
        return this.tracksService.markAsProcessed(user.id, id);
    }
    async updateManyStatus(user, body) {
        return this.tracksService.updateManyStatus(user.id, body.ids, body.status);
    }
    async remove(user, id) {
        return this.tracksService.remove(user.id, id);
    }
};
exports.TracksController = TracksController;
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, create_track_dto_1.CreateTrackDto]),
    __metadata("design:returntype", Promise)
], TracksController.prototype, "create", null);
__decorate([
    (0, common_1.Post)('batch'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Array]),
    __metadata("design:returntype", Promise)
], TracksController.prototype, "createMany", null);
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('status')),
    __param(2, (0, common_1.Query)('search')),
    __param(3, (0, common_1.Query)('skip', new common_1.DefaultValuePipe(0), common_1.ParseIntPipe)),
    __param(4, (0, common_1.Query)('take', new common_1.DefaultValuePipe(50), common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, Number, Number]),
    __metadata("design:returntype", Promise)
], TracksController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)('stats'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], TracksController.prototype, "getStats", null);
__decorate([
    (0, common_1.Get)('duplicates/:fileHash'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('fileHash')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], TracksController.prototype, "findDuplicates", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], TracksController.prototype, "findOne", null);
__decorate([
    (0, common_1.Patch)(':id'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, update_track_dto_1.UpdateTrackDto]),
    __metadata("design:returntype", Promise)
], TracksController.prototype, "update", null);
__decorate([
    (0, common_1.Patch)(':id/mark-processed'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], TracksController.prototype, "markAsProcessed", null);
__decorate([
    (0, common_1.Patch)('batch/status'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], TracksController.prototype, "updateManyStatus", null);
__decorate([
    (0, common_1.Delete)(':id'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], TracksController.prototype, "remove", null);
exports.TracksController = TracksController = __decorate([
    (0, common_1.Controller)('tracks'),
    (0, common_1.UseGuards)(clerk_auth_guard_1.ClerkAuthGuard),
    __metadata("design:paramtypes", [tracks_service_1.TracksService])
], TracksController);
//# sourceMappingURL=tracks.controller.js.map