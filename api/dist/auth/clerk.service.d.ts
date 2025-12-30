import { ConfigService } from '@nestjs/config';
export interface ClerkUser {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    imageUrl: string | null;
}
export declare class ClerkService {
    private configService;
    private clerk;
    private secretKey;
    constructor(configService: ConfigService);
    verifyTokenAndGetUser(token: string): Promise<ClerkUser>;
    getUser(userId: string): Promise<ClerkUser>;
}
