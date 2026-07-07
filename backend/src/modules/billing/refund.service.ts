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
    void this.n8n.triggerEvent('refund.processed', {
      refundId: refund.id,
      paymentId: dto.paymentId,
      invoiceId: payment.invoiceId,
      branchId: payment.branchId,
      amount: dto.amount,
      currency: 'ILS',
      reason: dto.reason,
      status: result.status,
      guestName: guest?.fullName ?? null,
      guestEmail: guest?.email ?? null,
    });

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
