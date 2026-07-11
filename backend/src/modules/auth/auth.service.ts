import { Injectable, UnauthorizedException, BadRequestException, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { NotificationService, wrapEmailHtml } from '../notifications/notification.service';
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
    private notificationService: NotificationService,
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

  async forgotPassword(email: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || !user.isActive) {
      return; // silent — don't reveal whether email exists
    }

    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    await this.prisma.passwordResetToken.create({
      data: { userId: user.id, tokenHash, expiresAt },
    });

    const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:3000';
    const resetLink = `${frontendUrl}/reset-password?token=${rawToken}`;

    const isDev = frontendUrl.startsWith('http://localhost');

    const tokenContent = isDev ? `
      <p style="color:#0F172A;font-size:14px;font-weight:bold;margin:0 0 10px 0;font-family:Arial,sans-serif">קוד לאיפוס סיסמה:</p>
      <div style="background-color:#F1F5F9;border:1px solid #E2E8F0;border-radius:8px;padding:16px 20px;margin-bottom:24px;direction:ltr;text-align:left">
        <span style="font-family:'Courier New',Courier,monospace;font-size:13px;color:#1E3A8A;letter-spacing:0.5px;word-break:break-all">${rawToken}</span>
      </div>
      <p style="color:#475569;font-size:14px;margin:0 0 28px 0;font-family:Arial,sans-serif">כנס לדף איפוס הסיסמה במערכת והדבק את הקוד.</p>` : `
      <p style="color:#0F172A;font-size:15px;line-height:1.7;margin:0 0 24px 0;font-family:Arial,sans-serif">לחץ על הכפתור למטה כדי לאפס את סיסמאתך:</p>
      <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom:28px">
        <tr><td align="center">
          <a href="${resetLink}" style="display:inline-block;background-color:#CA8A04;color:#FFFFFF;text-decoration:none;padding:14px 36px;border-radius:8px;font-size:16px;font-weight:bold;font-family:Arial,sans-serif">אפס סיסמה</a>
        </td></tr>
      </table>`;

    void this.notificationService.sendEmail({
      to: user.email,
      subject: 'איפוס סיסמה — מערכת ניהול מלון',
      text: `שלום ${user.name},\n\nקיבלנו בקשה לאיפוס הסיסמה עבור חשבונך.\n\n${isDev ? `קוד לאיפוס:\n${rawToken}\n\nכנס לדף איפוס הסיסמה במערכת והדבק את הקוד.` : `לאיפוס הסיסמה: ${resetLink}`}\n\nהקוד/קישור בתוקף לשעה אחת.\nאם לא ביקשת איפוס — התעלם ממייל זה.\n\nמערכת ניהול מלון`,
      body: wrapEmailHtml(`
        <h2 style="color:#1E3A8A;font-size:22px;margin:0 0 6px 0;font-family:Arial,sans-serif">איפוס סיסמה</h2>
        <div style="width:40px;height:3px;background-color:#CA8A04;border-radius:2px;margin-bottom:28px"></div>
        <p style="color:#475569;font-size:15px;margin:0 0 16px 0;font-family:Arial,sans-serif">שלום ${user.name},</p>
        <p style="color:#0F172A;font-size:15px;line-height:1.7;margin:0 0 28px 0;font-family:Arial,sans-serif">קיבלנו בקשה לאיפוס הסיסמה עבור חשבונך.</p>
        ${tokenContent}
        <hr style="border:none;border-top:1px solid #E2E8F0;margin:0 0 20px 0">
        <p style="color:#94A3B8;font-size:12px;margin:0 0 6px 0;font-family:Arial,sans-serif">הקוד בתוקף לשעה אחת בלבד.</p>
        <p style="color:#94A3B8;font-size:12px;margin:0;font-family:Arial,sans-serif">אם לא ביקשת איפוס סיסמה — התעלם ממייל זה.</p>
      `),
    });

    await this.auditService.log({
      userId: user.id,
      action: 'PASSWORD_RESET_REQUESTED',
      metadata: { email },
      branchId: user.branchId,
    });
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const resetToken = await this.prisma.passwordResetToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!resetToken) {
      throw new BadRequestException('INVALID_RESET_TOKEN');
    }
    if (resetToken.usedAt) {
      throw new BadRequestException('RESET_TOKEN_ALREADY_USED');
    }
    if (resetToken.expiresAt <= new Date()) {
      throw new BadRequestException('RESET_TOKEN_EXPIRED');
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: resetToken.userId },
        data: { passwordHash },
      }),
      this.prisma.passwordResetToken.update({
        where: { id: resetToken.id },
        data: { usedAt: new Date() },
      }),
      this.prisma.refreshToken.updateMany({
        where: { userId: resetToken.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);

    await this.auditService.log({
      userId: resetToken.userId,
      action: 'PASSWORD_RESET_COMPLETED',
      metadata: {},
      branchId: resetToken.user.branchId,
    });
  }

  async getSessions(userId: string) {
    return this.prisma.refreshToken.findMany({
      where: {
        userId,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      select: { id: true, createdAt: true, expiresAt: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async revokeSession(tokenId: string, userId: string): Promise<void> {
    const token = await this.prisma.refreshToken.findFirst({
      where: { id: tokenId, userId },
    });

    if (!token) {
      throw new NotFoundException('SESSION_NOT_FOUND');
    }

    await this.prisma.refreshToken.update({
      where: { id: tokenId },
      data: { revokedAt: new Date() },
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
// TEST_PHASE11_MARKER
