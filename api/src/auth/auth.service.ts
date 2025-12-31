import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto, LoginDto } from './dto';

export interface JwtPayload {
  userId: string;
  email: string;
}

export interface AuthResponse {
  user: {
    id: string;
    email: string;
    name?: string;
    lastName?: string;
  };
  token: string;
}

@Injectable()
export class AuthService {
  private readonly JWT_SECRET: string;
  private readonly JWT_EXPIRES_IN: string;

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {
    this.JWT_SECRET = this.config.get<string>('JWT_SECRET') || 'your-secret-key-change-in-production';
    this.JWT_EXPIRES_IN = this.config.get<string>('JWT_EXPIRES_IN') || '7d';
  }

  /**
   * Register a new user
   */
  async register(dto: RegisterDto): Promise<AuthResponse> {
    // Check if user already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });

    if (existingUser) {
      throw new ConflictException('Email already in use');
    }

    // Hash password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(dto.password, saltRounds);

    // Create user
    const user = await this.prisma.user.create({
      data: {
        email: dto.email.toLowerCase(),
        passwordHash,
        name: dto.name,
        lastName: dto.lastName,
      },
      select: {
        id: true,
        email: true,
        name: true,
        lastName: true,
        createdAt: true,
      },
    });

    // Generate token
    const token = this.generateToken({
      userId: user.id,
      email: user.email,
    });

    // Save session
    await this.createSession(user.id, token);

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name || undefined,
        lastName: user.lastName || undefined,
      },
      token,
    };
  }

  /**
   * Login user
   */
  async login(dto: LoginDto): Promise<AuthResponse> {
    // Find user
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
      select: {
        id: true,
        email: true,
        name: true,
        lastName: true,
        passwordHash: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Generate token
    const token = this.generateToken({
      userId: user.id,
      email: user.email,
    });

    // Save session
    await this.createSession(user.id, token);

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name || undefined,
        lastName: user.lastName || undefined,
      },
      token,
    };
  }

  /**
   * Logout user
   */
  async logout(token: string): Promise<void> {
    await this.prisma.session.deleteMany({
      where: { token },
    });
  }

  /**
   * Get user from token
   */
  async getUserFromToken(token: string) {
    try {
      const payload = jwt.verify(token, this.JWT_SECRET) as JwtPayload;

      const user = await this.prisma.user.findUnique({
        where: { id: payload.userId },
        select: {
          id: true,
          email: true,
          name: true,
          lastName: true,
          createdAt: true,
        },
      });

      return user;
    } catch (error) {
      throw new UnauthorizedException('Invalid token');
    }
  }

  /**
   * Verify token and get payload
   */
  async verifyToken(token: string): Promise<JwtPayload> {
    try {
      const payload = jwt.verify(token, this.JWT_SECRET) as JwtPayload;

      // Check if session exists
      const session = await this.prisma.session.findUnique({
        where: { token },
      });

      if (!session) {
        throw new UnauthorizedException('Session not found');
      }

      // Check if session expired
      if (session.expiresAt < new Date()) {
        await this.prisma.session.delete({
          where: { token },
        });
        throw new UnauthorizedException('Session expired');
      }

      return payload;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Invalid token');
    }
  }

  /**
   * Generate JWT token
   */
  private generateToken(payload: JwtPayload): string {
    return jwt.sign(payload, this.JWT_SECRET, {
      expiresIn: this.JWT_EXPIRES_IN,
    } as jwt.SignOptions);
  }

  /**
   * Create session in database
   */
  private async createSession(userId: string, token: string): Promise<void> {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

    await this.prisma.session.create({
      data: {
        userId,
        token,
        expiresAt,
      },
    });
  }
}
