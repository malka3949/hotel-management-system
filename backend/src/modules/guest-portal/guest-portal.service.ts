import * as crypto from 'crypto';
import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  NotImplementedException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { NotificationService, wrapEmailHtml } from '../notifications/notification.service';
import { OnlineCheckInDto } from './dto/online-check-in.dto';
import { PortalPaymentDto } from './dto/portal-payment.dto';
import { GuestTokenPayload } from './interfaces/guest-token-payload.interface';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { Prisma } from '@prisma/client';
import { ConfigService } from '@nestjs/config';

const CHECKIN_WINDOW_HOURS = 24;

function tokenHash(raw: string): string {
  return crypto.createHash('sha256').update(raw).digest('hex');
}

function generateRawToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

@Injectable()
export class GuestPortalService {
  private readonly logger = new Logger(GuestPortalService.name);

  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
    private config: ConfigService,
    private notifications: NotificationService,
  ) {}

  async generateAndSendPortalLink(
    reservationId: string,
    guestId: string,
    checkOutDate: Date,
    guestEmail: string | null,
    guestName: string,
  ): Promise<{ portalUrl: string; expiresAt: Date }> {
    const expiresAt = new Date(checkOutDate);
    expiresAt.setHours(expiresAt.getHours() + 24);

    const raw = generateRawToken();
    const hash = tokenHash(raw);

    await this.prisma.guestAccessToken.create({
      data: {
        reservationId,
        guestId,
        tokenHash: hash,
        purpose: 'view',
        expiresAt,
      },
    });

    const frontendUrl = this.config.get<string>('FRONTEND_URL', 'http://localhost:3000');
    const portalUrl = `${frontendUrl}/${raw}`;

    if (guestEmail) {
      void this.sendPortalEmail(guestEmail, guestName, portalUrl);
    }

    this.logger.log(`Portal link generated for reservation ${reservationId}`);
    return { portalUrl, expiresAt };
  }

  private sendPortalEmail(to: string, guestName: string, portalUrl: string): void {
    const isDev = portalUrl.includes('localhost');

    const linkContent = isDev ? `
      <p style="color:#0F172A;font-size:14px;font-weight:bold;margin:0 0 10px 0;font-family:Arial,sans-serif">
        קישור לפורטל <span style="color:#CA8A04;font-weight:normal">(סביבת פיתוח — העתק לדפדפן)</span>:
      </p>
      <div style="background-color:#F1F5F9;border:1px solid #E2E8F0;border-radius:8px;padding:16px 20px;margin-bottom:28px;direction:ltr;text-align:left">
        <span style="font-family:'Courier New',Courier,monospace;font-size:11px;color:#1E3A8A;word-break:break-all">${portalUrl}</span>
      </div>` : `
      <p style="color:#0F172A;font-size:15px;line-height:1.7;margin:0 0 24px 0;font-family:Arial,sans-serif">לחץ על הכפתור למטה כדי לגשת לפורטל:</p>
      <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom:28px">
        <tr><td align="center">
          <a href="${portalUrl}" style="display:inline-block;background-color:#1E3A8A;color:#FFFFFF;text-decoration:none;padding:14px 36px;border-radius:8px;font-size:16px;font-weight:bold;font-family:Arial,sans-serif">כניסה לפורטל</a>
        </td></tr>
      </table>`;

    void this.notifications.sendEmail({
      to,
      subject: 'פורטל אורחים — גישה להזמנה שלך',
      text: `שלום ${guestName},\n\nניתן לצפות בהזמנתך, לבצע צ'ק-אין מקוון ולשלם חשבונית.\n\nקישור לפורטל:\n${portalUrl}\n\nהקישור בתוקף עד 24 שעות לאחר צ'ק-אאוט.\n\nמערכת ניהול מלון`,
      body: wrapEmailHtml(`
        <h2 style="color:#1E3A8A;font-size:22px;margin:0 0 6px 0;font-family:Arial,sans-serif">פורטל אורחים</h2>
        <div style="width:40px;height:3px;background-color:#CA8A04;border-radius:2px;margin-bottom:28px"></div>
        <p style="color:#475569;font-size:15px;margin:0 0 16px 0;font-family:Arial,sans-serif">שלום ${guestName},</p>
        <p style="color:#0F172A;font-size:15px;line-height:1.7;margin:0 0 28px 0;font-family:Arial,sans-serif">
          ניתן לצפות בהזמנתך, לבצע צ'ק-אין מקוון ולשלם את חשבוניתך דרך פורטל האורחים.
        </p>
        ${linkContent}
        <hr style="border:none;border-top:1px solid #E2E8F0;margin:0 0 20px 0">
        <p style="color:#94A3B8;font-size:12px;margin:0;font-family:Arial,sans-serif">הקישור בתוקף עד 24 שעות לאחר צ'ק-אאוט.</p>
      `),
    });
  }

  async sendPortalLinkByStaff(reservationId: string, requester: JwtPayload): Promise<{ sent: boolean; portalUrl: string }> {
    const reservation = await this.prisma.reservation.findUnique({
      where: { id: reservationId },
      select: {
        id: true,
        branchId: true,
        checkOutDate: true,
        guest: { select: { id: true, fullName: true, email: true } },
      },
    });
    if (!reservation) throw new NotFoundException('RESERVATION_NOT_FOUND');
    if (requester.role !== 'chain_admin' && reservation.branchId !== requester.branchId) {
      throw new ForbiddenException('BRANCH_ACCESS_DENIED');
    }

    const result = await this.generateAndSendPortalLink(
      reservation.id,
      reservation.guest.id,
      reservation.checkOutDate,
      reservation.guest.email,
      reservation.guest.fullName,
    );

    return { sent: !!reservation.guest.email, portalUrl: result.portalUrl };
  }

  async validateToken(rawToken: string): Promise<GuestTokenPayload | null> {
    const hash = tokenHash(rawToken);

    const record = await this.prisma.guestAccessToken.findFirst({
      where: { tokenHash: hash },
    });

    if (!record) return null;
    if (record.revokedAt) return null;
    if (record.expiresAt < new Date()) return null;

    return {
      reservationId: record.reservationId,
      guestId: record.guestId,
      tokenId: record.id,
      purpose: record.purpose as 'view' | 'checkin' | 'payment',
      expiresAt: record.expiresAt.toISOString(),
      usedAt: record.usedAt,
    };
  }

  async getReservation(reservationId: string) {
    const res = await this.prisma.reservation.findUnique({
      where: { id: reservationId },
      include: {
        guest: { select: { id: true, fullName: true, email: true, phone: true, passportId: true } },
        room: {
          select: {
            id: true,
            number: true,
            floor: true,
            roomType: { select: { id: true, name: true } },
          },
        },
        checkIn: true,
        checkOut: true,
        invoice: {
          select: {
            id: true,
            status: true,
            subtotal: true,
            tax: true,
            total: true,
            payments: {
              where: { status: 'succeeded' },
              select: { id: true, amount: true, paidAt: true },
            },
          },
        },
        onlineCheckIn: true,
      },
    });

    if (!res) throw new NotFoundException('RESERVATION_NOT_FOUND');
    return res;
  }

  async getInvoiceDetail(reservationId: string) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { reservationId },
      include: {
        lineItems: true,
        charges: true,
        payments: { where: { status: 'succeeded' } },
        branch: { select: { name: true, address: true } },
      },
    });
    if (!invoice) throw new NotFoundException('INVOICE_NOT_FOUND');
    return invoice;
  }

  async submitOnlineCheckIn(
    reservationId: string,
    guestId: string,
    dto: OnlineCheckInDto,
  ) {
    const reservation = await this.prisma.reservation.findUnique({
      where: { id: reservationId },
      select: { checkInDate: true, checkIn: { select: { id: true } } },
    });
    if (!reservation) throw new NotFoundException('RESERVATION_NOT_FOUND');

    if (reservation.checkIn) {
      throw new BadRequestException('CHECK_IN_ALREADY_COMPLETED');
    }

    const now = new Date();
    const checkInDate = new Date(reservation.checkInDate);
    checkInDate.setHours(0, 0, 0, 0);
    const windowOpenAt = new Date(checkInDate);
    windowOpenAt.setHours(windowOpenAt.getHours() - CHECKIN_WINDOW_HOURS);

    if (now < windowOpenAt) {
      throw new BadRequestException('CHECK_IN_WINDOW_NOT_OPEN');
    }

    const existing = await this.prisma.onlineCheckIn.findUnique({
      where: { reservationId },
    });

    let onlineCheckIn;
    if (existing) {
      onlineCheckIn = await this.prisma.onlineCheckIn.update({
        where: { reservationId },
        data: {
          fullName: dto.fullName,
          passportId: dto.passportId,
          email: dto.email ?? null,
          phone: dto.phone ?? null,
          estimatedArrivalTime: dto.estimatedArrivalTime ?? null,
          specialRequests: dto.specialRequests ?? null,
          completedAt: new Date(),
        },
      });
    } else {
      onlineCheckIn = await this.prisma.onlineCheckIn.create({
        data: {
          reservationId,
          guestId,
          fullName: dto.fullName,
          passportId: dto.passportId,
          email: dto.email ?? null,
          phone: dto.phone ?? null,
          estimatedArrivalTime: dto.estimatedArrivalTime ?? null,
          specialRequests: dto.specialRequests ?? null,
        },
      });
    }

    await this.prisma.guest.update({
      where: { id: guestId },
      data: {
        fullName: dto.fullName,
        passportId: dto.passportId,
        ...(dto.email ? { email: dto.email } : {}),
        ...(dto.phone ? { phone: dto.phone } : {}),
      },
    });

    await this.audit.log({
      userId: null,
      action: 'ONLINE_CHECK_IN_SUBMITTED',
      entityType: 'reservation',
      entityId: reservationId,
      branchId: null,
      metadata: { guestId, reservationId },
    });

    return onlineCheckIn;
  }

  async processPortalPayment(
    reservationId: string,
    tokenId: string,
    dto: PortalPaymentDto,
  ) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { reservationId },
    });
    if (!invoice) throw new NotFoundException('INVOICE_NOT_FOUND');
    if (invoice.status === 'paid') throw new BadRequestException('INVOICE_ALREADY_PAID');
    if (invoice.status === 'void') throw new BadRequestException('INVOICE_VOID');

    const paymentCount = await this.prisma.payment.count({
      where: { invoiceId: invoice.id },
    });
    const attemptNumber = paymentCount + 1;
    const idempotencyKey = `portal:${reservationId}:${invoice.id}:${attemptNumber}`;

    const payAmount = dto.amount ?? Number(invoice.total);

    // Real payment provider integration required before enabling portal payments.
    // The previous stub accepted non-Stripe providers unconditionally (succeeded = true).
    if (dto.provider !== 'stripe') {
      throw new NotImplementedException(`Payment provider '${dto.provider}' not supported via guest portal`);
    }
    if (!dto.token) {
      throw new BadRequestException('STRIPE_TOKEN_REQUIRED');
    }
    // TODO: call real Stripe PaymentIntent confirm via PaymentService before recording success.
    const succeeded = false; // fail-closed until real Stripe flow is wired

    const payment = await this.prisma.$transaction(async (tx) => {
      const p = await tx.payment.create({
        data: {
          branchId: invoice.branchId,
          invoiceId: invoice.id,
          reservationId,
          amount: new Prisma.Decimal(payAmount),
          currency: 'ILS',
          status: succeeded ? 'succeeded' : 'failed',
          paymentMethod: dto.paymentMethod,
          provider: dto.provider,
          idempotencyKey,
          paidAt: succeeded ? new Date() : null,
          createdBy: null,
        },
      });

      await tx.paymentAttempt.create({
        data: {
          paymentId: p.id,
          attemptNumber,
          status: succeeded ? 'succeeded' : 'failed',
        },
      });

      if (succeeded) {
        await tx.invoice.update({
          where: { id: invoice.id },
          data: { status: 'paid' },
        });

        await tx.guestAccessToken.update({
          where: { id: tokenId },
          data: { usedAt: new Date() },
        });
      }

      return p;
    });

    await this.audit.log({
      userId: null,
      action: succeeded ? 'PORTAL_PAYMENT_SUCCEEDED' : 'PORTAL_PAYMENT_FAILED',
      entityType: 'invoice',
      entityId: invoice.id,
      branchId: invoice.branchId,
      metadata: { reservationId, amount: payAmount, provider: dto.provider },
    });

    if (!succeeded) {
      throw new BadRequestException('PAYMENT_FAILED');
    }

    return payment;
  }

  async listActiveTokens(reservationId: string, requester: JwtPayload) {
    const reservation = await this.prisma.reservation.findUnique({
      where: { id: reservationId },
      select: { branchId: true },
    });
    if (!reservation) throw new NotFoundException('RESERVATION_NOT_FOUND');
    if (requester.role !== 'chain_admin' && reservation.branchId !== requester.branchId) {
      throw new ForbiddenException('BRANCH_ACCESS_DENIED');
    }
    return this.prisma.guestAccessToken.findMany({
      where: {
        reservationId,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      select: {
        id: true,
        purpose: true,
        expiresAt: true,
        usedAt: true,
        createdAt: true,
      },
    });
  }

  async revokeAllTokens(reservationId: string, requester: JwtPayload): Promise<{ count: number }> {
    const reservation = await this.prisma.reservation.findUnique({
      where: { id: reservationId },
      select: { branchId: true },
    });
    if (!reservation) throw new NotFoundException('RESERVATION_NOT_FOUND');
    if (requester.role !== 'chain_admin' && reservation.branchId !== requester.branchId) {
      throw new ForbiddenException('BRANCH_ACCESS_DENIED');
    }
    const result = await this.prisma.guestAccessToken.updateMany({
      where: { reservationId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return { count: result.count };
  }
}
