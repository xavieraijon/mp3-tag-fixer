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
exports.ClerkService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const backend_1 = require("@clerk/backend");
let ClerkService = class ClerkService {
    configService;
    clerk;
    secretKey;
    constructor(configService) {
        this.configService = configService;
        this.secretKey = this.configService.get('CLERK_SECRET_KEY') || '';
        if (!this.secretKey) {
            console.warn('[ClerkService] CLERK_SECRET_KEY not configured - auth will fail');
        }
        this.clerk = (0, backend_1.createClerkClient)({ secretKey: this.secretKey });
    }
    async verifyTokenAndGetUser(token) {
        try {
            const payload = await (0, backend_1.verifyToken)(token, {
                secretKey: this.secretKey,
            });
            if (!payload.sub) {
                throw new common_1.UnauthorizedException('Invalid token: no subject');
            }
            const user = await this.clerk.users.getUser(payload.sub);
            return {
                id: user.id,
                email: user.emailAddresses[0]?.emailAddress || '',
                firstName: user.firstName,
                lastName: user.lastName,
                imageUrl: user.imageUrl,
            };
        }
        catch (error) {
            console.error('[ClerkService] Token verification failed:', error);
            throw new common_1.UnauthorizedException('Invalid or expired token');
        }
    }
    async getUser(userId) {
        try {
            const user = await this.clerk.users.getUser(userId);
            return {
                id: user.id,
                email: user.emailAddresses[0]?.emailAddress || '',
                firstName: user.firstName,
                lastName: user.lastName,
                imageUrl: user.imageUrl,
            };
        }
        catch (error) {
            console.error('[ClerkService] Failed to get user:', error);
            throw new common_1.UnauthorizedException('User not found');
        }
    }
};
exports.ClerkService = ClerkService;
exports.ClerkService = ClerkService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], ClerkService);
//# sourceMappingURL=clerk.service.js.map