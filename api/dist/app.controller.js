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
exports.AppController = void 0;
const common_1 = require("@nestjs/common");
const app_service_1 = require("./app.service");
const public_decorator_1 = require("./auth/decorators/public.decorator");
const current_user_decorator_1 = require("./auth/decorators/current-user.decorator");
const users_service_1 = require("./users/users.service");
let AppController = class AppController {
    appService;
    usersService;
    constructor(appService, usersService) {
        this.appService = appService;
        this.usersService = usersService;
    }
    healthCheck() {
        return {
            status: 'ok',
            timestamp: new Date().toISOString(),
        };
    }
    async getMe(clerkUser) {
        const user = await this.usersService.findOrCreateFromClerk(clerkUser);
        return {
            id: user.id,
            email: user.email,
            name: user.name,
            avatarUrl: user.avatarUrl,
            subscriptionStatus: user.subscriptionStatus,
            createdAt: user.createdAt,
        };
    }
};
exports.AppController = AppController;
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Get)('health'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AppController.prototype, "healthCheck", null);
__decorate([
    (0, common_1.Get)('me'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AppController.prototype, "getMe", null);
exports.AppController = AppController = __decorate([
    (0, common_1.Controller)(),
    __metadata("design:paramtypes", [app_service_1.AppService,
        users_service_1.UsersService])
], AppController);
//# sourceMappingURL=app.controller.js.map