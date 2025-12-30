import { CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ClerkService } from '../clerk.service';
export declare class ClerkAuthGuard implements CanActivate {
    private clerkService;
    private reflector;
    constructor(clerkService: ClerkService, reflector: Reflector);
    canActivate(context: ExecutionContext): Promise<boolean>;
}
