import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { N8nService } from '../notifications/n8n.service';
import { NotificationService, wrapEmailHtml } from '../notifications/notification.service';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { CreateRefundDto } from './dto/create-refund.dto';
import { StripeProvider } from './providers/stripe.provider';
import { ManualProvider } from './providers/manual.provider';
import { TranzilaProvider } from './providers/tranzila.provider';

@Injectable()
export class RefundService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
    private n8n: N8nService,
    private notifications: NotificationService,
    private stripeProvider: StripeProvider,
    private manualProvider: ManualProvider,
    private tranzilaProvider: TranzilaProvider,
  ) {}

  async initiateRefund(dto: CreateRefundDto, requester: JwtPayload) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: dto.paymentId },
      include: {
        invoice: {
          include: {
            reservation: {
              include: { guest: { select: { fullName: true, email: true } } },
            },
          },
        },
      },
    });
    if (!payment) throw new NotFoundException('PAYMENT_NOT_FOUND');
    this.assertBranchAccess(payment.branchId, requester);

    if (payment.status !== 'succeeded') {
      throw new BadRequestException('PAYMENT_NOT_SUCCEEDED');
    }

    if (new Prisma.Decimal(dto.amount).gt(payment.amount)) {
      throw new BadRequestException('REFUND_EXCEEDS_PAYMENT');
    }

    const provider = this.selectProvider(payment.provider);
    const result = await provider.refund(
      payment.providerPaymentId ?? payment.id,
      dto.amount,
    );

    const refund = await this.prisma.$transaction(async (tx) => {
      const r = await tx.refund.create({
        data: {
          branchId: payment.branchId,
          paymentId: dto.paymentId,
          amount: new Prisma.Decimal(dto.amount),
          reason: dto.reason,
          status: result.status,
          providerRefundId: result.providerRefundId,
          approvedBy: requester.sub,
        },
      });

      if (result.status === 'succeeded') {
        await tx.payment.update({
          where: { id: dto.paymentId },
          data: { status: 'refunded' },
        });
      }

      return r;
    });

    await this.audit.log({
      userId: requester.sub,
      action: 'REFUND_PROCESSED',
      entityType: 'payment',
      entityId: dto.paymentId,
      branchId: payment.branchId,
      metadata: {
        amount: dto.amount,
        reason: dto.reason,
        refundStatus: result.status,
        providerRefundId: result.providerRefundId,
      },
    });

    const guest = payment.invoice?.reservation?.guest;
    if (result.status === 'succeeded' && guest?.email) {
      void this.notifications.sendEmail({
        to: guest.email,
        subject: 'אישור זיכוי — מערכת ניהול מלון',
        text: `שלום ${guest.fullName},\n\nזיכוי בסך ₪${Number(dto.amount).toFixed(2)} בוצע בהצלחה.\n\nסיבה: ${dto.reason ?? 'לא צוינה'}\n\nהסכום יופיע בחשבונך בהתאם למדיניות ספק התשלום.\n\nמערכת ניהול מלון`,
        body: wrapEmailHtml(`
          <h2 style="color:#1E3A8A;font-size:22px;margin:0 0 6px 0;font-family:Arial,sans-serif">אישור זיכוי</h2>
          <div style="width:40px;height:3px;background-color:#CA8A04;border-radius:2px;margin-bottom:28px"></div>
          <p style="color:#475569;font-size:15px;margin:0 0 16px 0;font-family:Arial,sans-serif">שלום ${guest.fullName},</p>
          <p style="color:#0F172A;font-size:15px;line-height:1.7;margin:0 0 24px 0;font-family:Arial,sans-serif">
            זיכוי בגין הזמנתך בוצע בהצלחה.
          </p>
          <table cellpadding="0" cellspacing="0" border="0" width="100%" style="border:1px solid #E2E8F0;border-radius:8px;margin-bottom:28px;font-family:Arial,sans-serif;border-collapse:collapse">
            <tr>
              <td bgcolor="#F8FAFC" style="padding:11px 16px;font-size:13px;color:#475569;width:50%;border-bottom:1px solid #E2E8F0">סכום זיכוי</td>
              <td bgcolor="#F8FAFC" style="padding:11px 16px;font-size:13px;color:#0F172A;font-weight:bold;border-bottom:1px solid #E2E8F0">&#8362;${Number(dto.amount).toFixed(2)}</td>
            </tr>
            <tr>
              <td bgcolor="#FFFFFF" style="padding:11px 16px;font-size:13px;color:#475569">סיבה</td>
              <td bgcolor="#FFFFFF" style="padding:11px 16px;font-size:13px;color:#0F172A">${dto.reason ?? '—'}</td>
            </tr>
          </table>
          <p style="color:#475569;font-size:14px;margin:0 0 20px 0;font-family:Arial,sans-serif">
            הסכום יופיע בחשבונך בהתאם למדיניות ספק התשלום.
          </p>
          <hr style="border:none;border-top:1px solid #E2E8F0;margin:0 0 20px 0">
          <p style="color:#94A3B8;font-size:12px;margin:0;font-family:Arial,sans-serif">לשאלות, פנה לצוות הקבלה.</p>
        `),
      });
    }

    return refund;
  }

  async getRefund(refundId: string, requester: JwtPayload) {
    const refund = await this.prisma.refund.findUnique({
      where: { id: refundId },
      include: { payment: true },
    });
    if (!refund) throw new NotFoundException('REFUND_NOT_FOUND');
    this.assertBranchAccess(refund.branchId, requester);
    return refund;
  }

  private selectProvider(provider: string) {
    switch (provider) {
      case 'stripe': return this.stripeProvider;
      case 'tranzila': return this.tranzilaProvider;
      default: return this.manualProvider;
    }
  }

  private assertBranchAccess(entityBranchId: string, requester: JwtPayload): void {
    if (requester.role !== 'chain_admin' && entityBranchId !== requester.branchId) {
      throw new ForbiddenException('BRANCH_ACCESS_DENIED');
    }
  }
}
