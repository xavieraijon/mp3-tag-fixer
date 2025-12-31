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
exports.PaymentsController = void 0;
const common_1 = require("@nestjs/common");
const payments_service_1 = require("./payments.service");
const create_checkout_dto_1 = require("./dto/create-checkout.dto");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const user_id_decorator_1 = require("../auth/decorators/user-id.decorator");
const public_decorator_1 = require("../auth/decorators/public.decorator");
const users_service_1 = require("../users/users.service");
let PaymentsController = class PaymentsController {
    paymentsService;
    usersService;
    constructor(paymentsService, usersService) {
        this.paymentsService = paymentsService;
        this.usersService = usersService;
    }
    async getPlans() {
        return this.paymentsService.getPlans();
    }
    async getStatus(userId) {
        return this.paymentsService.getSubscriptionStatus(userId);
    }
    async createCheckout(userId, dto) {
        const user = await this.usersService.findById(userId);
        if (!user) {
            throw new common_1.NotFoundException('User not found');
        }
        return this.paymentsService.createCheckoutSession(userId, user.email, dto.priceId, dto.successUrl, dto.cancelUrl, dto.couponCode);
    }
    async createPortal(userId) {
        return this.paymentsService.createPortalSession(userId);
    }
    async cancelSubscription(userId) {
        await this.paymentsService.cancelSubscription(userId);
        return { message: 'Subscription will be canceled at the end of the billing period' };
    }
    async handleWebhook(signature, payload) {
        await this.paymentsService.handleWebhook(signature, payload);
        return { received: true };
    }
};
exports.PaymentsController = PaymentsController;
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Get)('plans'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], PaymentsController.prototype, "getPlans", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Get)('status'),
    __param(0, (0, user_id_decorator_1.UserId)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], PaymentsController.prototype, "getStatus", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Post)('checkout'),
    __param(0, (0, user_id_decorator_1.UserId)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, create_checkout_dto_1.CreateCheckoutDto]),
    __metadata("design:returntype", Promise)
], PaymentsController.prototype, "createCheckout", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Post)('portal'),
    __param(0, (0, user_id_decorator_1.UserId)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], PaymentsController.prototype, "createPortal", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Post)('cancel'),
    __param(0, (0, user_id_decorator_1.UserId)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], PaymentsController.prototype, "cancelSubscription", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Post)('webhook'),
    __param(0, (0, common_1.Headers)('stripe-signature')),
    __param(1, (0, common_1.RawBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Buffer]),
    __metadata("design:returntype", Promise)
], PaymentsController.prototype, "handleWebhook", null);
exports.PaymentsController = PaymentsController = __decorate([
    (0, common_1.Controller)('payments'),
    __metadata("design:paramtypes", [payments_service_1.PaymentsService,
        users_service_1.UsersService])
], PaymentsController);
//# sourceMappingURL=payments.controller.js.map