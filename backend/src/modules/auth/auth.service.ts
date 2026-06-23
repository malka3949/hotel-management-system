import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { LoginDto } from './dto/login.dto';
import { JwtPayload } from './interfaces/jwt-payload.interface';
import { Role } from '@prisma/client';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface LoginResult extends AuthTokens {
  user: {
    id: string;
    name: string;
    email: string;
    role: Role;
    branchId: string | null;
  };
}

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private config: ConfigService,
    private auditService: AuditService,
  ) {}

  async login(dto: LoginDto, ip: string, userAgent: string): Promise<LoginResult> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user || !user.isActive) {
      await this.auditService.log({
        userId: user?.id ?? null,
        action: 'FAILED_LOGIN',
        metadata: { ip, userAgent, reason: user ? 'inactive' : 'not_found' },
        branchId: user?.branchId ?? null,
      });
      throw new UnauthorizedException('INVALID_CREDENTIALS');
    }

    const passwordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordValid) {
      await this.auditService.log({
        userId: user.id,
        action: 'FAILED_LOGIN',
        metadata: { ip, userAgent, reason: 'wrong_password' },
        branchId: user.branchId,
      });
      throw new UnauthorizedException('INVALID_CREDENTIALS');
    }

    const tokens = await this.issueTokens(user.id, user.email, user.role, user.branchId);

    await this.auditService.log({
      userId: user.id,
      action: 'LOGIN',
      metadata: { ip, userAgent },
      branchId: user.branchId,
    });

    return {
      ...tokens,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        branchId: user.branchId,
      },
    };
  }

  async refresh(refreshToken: string): Promise<AuthTokens> {
    const tokenHash = this.hashToken(refreshToken);

    const stored = await this.prisma.refreshToken.findFirst({
      where: { tokenHash, revokedAt: null },
      include: { user: true },
    });

    if (!stored || stored.expiresAt <= new Date()) {
      throw new UnauthorizedException('REFRESH_TOKEN_INVALID');
    }

    const newRawToken = crypto.randomBytes(40).toString('hex');
    const newTokenHash = this.hashToken(newRawToken);
    const refreshTtl = this.config.get<string>('JWT_REFRESH_EXPIRES_IN', '7d');
    const expiresAt = new Date(Date.now() + this.parseDuration(refreshTtl));

    await this.prisma.$transaction([
      this.prisma.refreshToken.update({
        where: { id: stored.id },
        data: { revokedAt: new Date() },
      }),
      this.prisma.refreshToken.create({
        data: {
          userId: stored.user.id,
          tokenHash: newTokenHash,
          expiresAt,
          branchId: stored.user.branchId,
        },
      }),
    ]);

    const payload: JwtPayload = {
      sub: stored.user.id,
      email: stored.user.email,
      role: stored.user.role,
      branchId: stored.user.branchId,
    };
    const accessToken = this.jwtService.sign(payload, {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expiresIn: this.config.get('JWT_ACCESS_EXPIRES_IN', '15m') as any,
    });

    return { accessToken, refreshToken: newRawToken };
  }

  async logout(refreshToken: string, userId: string, ip: string): Promise<void> {
    const tokenHash = this.hashToken(refreshToken);

    await this.prisma.refreshToken.updateMany({
      where: { tokenHash, userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    await this.auditService.log({
      userId,
      action: 'LOGOUT',
      metadata: { ip },
      branchId: null,
    });
  }

  async logoutAll(userId: string, ip: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    await this.auditService.log({
      userId,
      action: 'LOGOUT_ALL',
      metadata: { ip },
      branchId: null,
    });
  }

  private async issueTokens(
    userId: string,
    email: string,
    role: Role,
    branchId: string | null,
  ): Promise<AuthTokens> {
    const payload: JwtPayload = { sub: userId, email, role, branchId };

    const accessToken = this.jwtService.sign(payload, {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expiresIn: this.config.get('JWT_ACCESS_EXPIRES_IN', '15m') as any,
    });

    const refreshToken = crypto.randomBytes(40).toString('hex');
    const tokenHash = this.hashToken(refreshToken);
    const refreshTtl = this.config.get<string>('JWT_REFRESH_EXPIRES_IN', '7d');
    const expiresAt = new Date(Date.now() + this.parseDuration(refreshTtl));

    await this.prisma.refreshToken.create({
      data: { userId, tokenHash, expiresAt, branchId },
    });

    return { accessToken, refreshToken };
  }

  private hashToken(token: string): string {
    const key = this.config.getOrThrow<string>('REFRESH_TOKEN_HMAC_KEY');
    return crypto.createHmac('sha256', key).update(token).digest('hex');
  }

  private parseDuration(duration: string): number {
    const match = /^(\d+)([smhd])$/.exec(duration);
    if (!match) return 7 * 24 * 60 * 60 * 1000;
    const value = parseInt(match[1], 10);
    const unit = match[2];
    const multipliers: Record<string, number> = {
      s: 1000,
      m: 60 * 1000,
      h: 60 * 60 * 1000,
      d: 24 * 60 * 60 * 1000,
    };
    return value * (multipliers[unit] ?? 1000);
  }
}
