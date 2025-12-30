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
Object.defineProperty(exports, "__esModule", { value: true });
exports.TracksService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const client_1 = require("@prisma/client");
let TracksService = class TracksService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(userId, dto) {
        return this.prisma.track.create({
            data: {
                userId,
                ...dto,
            },
        });
    }
    async findAllByUser(userId, options) {
        const where = { userId };
        if (options?.status) {
            where.status = options.status;
        }
        if (options?.search) {
            where.OR = [
                { title: { contains: options.search, mode: 'insensitive' } },
                { artist: { contains: options.search, mode: 'insensitive' } },
                { album: { contains: options.search, mode: 'insensitive' } },
                { originalFilename: { contains: options.search, mode: 'insensitive' } },
            ];
        }
        const [tracks, total] = await Promise.all([
            this.prisma.track.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                skip: options?.skip,
                take: options?.take,
            }),
            this.prisma.track.count({ where }),
        ]);
        return { tracks, total };
    }
    async findOne(userId, id) {
        const track = await this.prisma.track.findFirst({
            where: { id, userId },
        });
        if (!track) {
            throw new common_1.NotFoundException(`Track with ID ${id} not found`);
        }
        return track;
    }
    async update(userId, id, dto) {
        await this.findOne(userId, id);
        return this.prisma.track.update({
            where: { id },
            data: dto,
        });
    }
    async remove(userId, id) {
        await this.findOne(userId, id);
        return this.prisma.track.delete({
            where: { id },
        });
    }
    async markAsProcessed(userId, id) {
        await this.findOne(userId, id);
        return this.prisma.track.update({
            where: { id },
            data: {
                status: client_1.TrackStatus.DONE,
                processedAt: new Date(),
            },
        });
    }
    async findDuplicates(userId, fileHash) {
        return this.prisma.track.findMany({
            where: {
                userId,
                fileHash,
            },
            orderBy: { createdAt: 'desc' },
        });
    }
    async getStats(userId) {
        const [total, byStatus] = await Promise.all([
            this.prisma.track.count({ where: { userId } }),
            this.prisma.track.groupBy({
                by: ['status'],
                where: { userId },
                _count: true,
            }),
        ]);
        const statusCounts = {};
        for (const item of byStatus) {
            statusCounts[item.status] = item._count;
        }
        return {
            total,
            byStatus: statusCounts,
        };
    }
    async createMany(userId, tracks) {
        const data = tracks.map((track) => ({
            userId,
            ...track,
        }));
        return this.prisma.track.createMany({
            data,
            skipDuplicates: true,
        });
    }
    async updateManyStatus(userId, ids, status) {
        return this.prisma.track.updateMany({
            where: {
                id: { in: ids },
                userId,
            },
            data: { status },
        });
    }
};
exports.TracksService = TracksService;
exports.TracksService = TracksService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], TracksService);
//# sourceMappingURL=tracks.service.js.map