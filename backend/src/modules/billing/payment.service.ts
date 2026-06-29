import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { N8nService } from '../notifications/n8n.service';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { PrePaymentDto } from './dto/pre-payment.dto';
import { StripeProvider } from './providers/stripe.provider';
import { ManualProvider } from './providers/manual.provider';
import { TranzilaProvider } from './providers/tranzila.provider';
import Stripe from 'stripe';

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);

  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
    private n8n: N8nService,
    private config: ConfigService,
    private stripeProvider: StripeProvider,
    private manualProvider: ManualProvider,
    private tranzilaProvider: TranzilaProvider,
  ) {}

  async initiatePayment(dto: CreatePaymentDto, requester: JwtPayload) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id: dto.invoiceId },
      include: {
        reservation: {
          include: { guest: { select: { fullName: true, email: true } } },
        },
      },
    });
    if (!invoice) throw new NotFoundException('INVOICE_NOT_FOUND');
    this.assertBranchAccess(invoice.branchId, requester);

    if (invoice.status === 'paid') throw new BadRequestException('INVOICE_ALREADY_PAID');
    if (invoice.status === 'void') throw new BadRequestException('INVOICE_VOID');

    const paymentCount = await this.prisma.payment.count({
      where: { invoiceId: dto.invoiceId },
    });
    const attemptNumber = paymentCount + 1;
    const idempotencyKey = `${invoice.reservationId}:${dto.invoiceId}:${attemptNumber}`;

    const payAmount = dto.amount ?? Number(invoice.total);
    const provider = this.selectProvider(dto.provider);

    const chargeResult = await provider.charge(
      payAmount,
      'ILS',
      dto.token ?? '',
      idempotencyKey,
    );

    const payment = await this.prisma.$transaction(async (tx) => {
      const p = await tx.payment.create({
        data: {
          branchId: invoice.branchId,
          invoiceId: dto.invoiceId,
          reservationId: invoice.reservationId,
          amount: new Prisma.Decimal(payAmount),
          currency: 'ILS',
          status: chargeResult.status === 'succeeded' ? 'succeeded' : 'failed',
          paymentMethod: dto.paymentMethod,
          provider: dto.provider,
          providerPaymentId: chargeResult.providerPaymentId,
          idempotencyKey,
          metadata: chargeResult.metadata as Prisma.InputJsonObject,
          paidAt: chargeResult.status === 'succeeded' ? new Date() : null,
          createdBy: requester.sub,
        },
      });

      await tx.paymentAttempt.create({
        data: {
          paymentId: p.id,
          attemptNumber,
          status: chargeResult.status === 'succeeded' ? 'succeeded' : 'failed',
          errorCode: chargeResult.errorCode ?? null,
          errorMessage: chargeResult.errorMessage ?? null,
          providerResponse: chargeResult.metadata as Prisma.InputJsonObject,
        },
      });

      if (chargeResult.status === 'succeeded') {
        const invoiceUpdate: { status: 'paid'; total?: Prisma.Decimal } = { status: 'paid' };
        if (dto.amount !== undefined && dto.amount < Number(invoice.total)) {
          invoiceUpdate.total = new Prisma.Decimal(payAmount);
        }
        await tx.invoice.update({
          where: { id: dto.invoiceId },
          data: invoiceUpdate,
        });
      }

      return p;
    });

    await this.audit.log({
      userId: requester.sub,
      action:
        chargeResult.status === 'succeeded' ? 'PAYMENT_SUCCEEDED' : 'PAYMENT_FAILED',
      entityType: 'invoice',
      entityId: dto.invoiceId,
      branchId: invoice.branchId,
      metadata: {
        paymentId: payment.id,
        amount: payAmount,
        provider: dto.provider,
        paymentMethod: dto.paymentMethod,
      },
    });

    const guest = invoice.reservation.guest;
    void this.n8n.triggerEvent(
      chargeResult.status === 'succeeded' ? 'payment.succeeded' : 'payment.failed',
      {
        paymentId: payment.id,
        invoiceId: dto.invoiceId,
        reservationId: invoice.reservationId,
        branchId: invoice.branchId,
        amount: payAmount,
        currency: 'ILS',
        paymentMethod: dto.paymentMethod,
        provider: dto.provider,
        guestName: guest?.fullName ?? null,
        guestEmail: guest?.email ?? null,
        errorCode: chargeResult.errorCode ?? null,
      },
    );

    return payment;
  }

  async initiatePrePayment(
    reservationId: string,
    dto: PrePaymentDto,
    requester: JwtPayload,
  ) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { reservationId },
    });
    if (!invoice) throw new NotFoundException('INVOICE_NOT_FOUND');
    this.assertBranchAccess(invoice.branchId, requester);

    if (invoice.status === 'paid') throw new BadRequestException('INVOICE_ALREADY_PAID');
    if (invoice.status === 'void') throw new BadRequestException('INVOICE_VOID');

    if (new Prisma.Decimal(dto.amount).gt(invoice.total)) {
      throw new BadRequestException('PRE_PAYMENT_EXCEEDS_TOTAL');
    }

    return this.initiatePayment(
      {
        invoiceId: invoice.id,
        paymentMethod: dto.paymentMethod,
        provider: dto.provider,
        token: dto.token,
        amount: dto.amount,
      },
      requester,
    );
  }

  async getPayment(paymentId: string, requester: JwtPayload) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: { attempts: true, refunds: true },
    });
    if (!payment) throw new NotFoundException('PAYMENT_NOT_FOUND');
    this.assertBranchAccess(payment.branchId, requester);
    return payment;
  }

  async getInvoiceById(invoiceId: string, requester: JwtPayload) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        lineItems: true,
        charges: true,
        reservation: {
          select: { id: true, checkInDate: true, checkOutDate: true },
        },
      },
    });
    if (!invoice) throw new NotFoundException('INVOICE_NOT_FOUND');
    this.assertBranchAccess(invoice.branchId, requester);
    return invoice;
  }

  async getInvoicePayments(invoiceId: string, requester: JwtPayload) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id: invoiceId },
    });
    if (!invoice) throw new NotFoundException('INVOICE_NOT_FOUND');
    this.assertBranchAccess(invoice.branchId, requester);

    return this.prisma.payment.findMany({
      where: { invoiceId },
      include: { attempts: true, refunds: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async handleStripeWebhook(rawBody: Buffer, sig: string): Promise<void> {
    const webhookSecret = this.config.get<string>('STRIPE_WEBHOOK_SECRET');
    if (!webhookSecret) {
      this.logger.warn('STRIPE_WEBHOOK_SECRET not set — skipping signature verification');
      return;
    }

    let event: Stripe.Event;
    try {
      event = this.stripeProvider.constructWebhookEvent(rawBody, sig, webhookSecret);
    } catch {
      this.logger.error('Stripe webhook signature verification failed');
      throw new BadRequestException('WEBHOOK_SIGNATURE_INVALID');
    }

    if (event.type === 'payment_intent.succeeded') {
      const intent = event.data.object as Stripe.PaymentIntent;
      await this.prisma.payment.updateMany({
        where: { providerPaymentId: intent.id, status: { not: 'succeeded' } },
        data: { status: 'succeeded', paidAt: new Date() },
      });
      await this.prisma.invoice.updateMany({
        where: {
          payments: { some: { providerPaymentId: intent.id } },
          status: 'finalized',
        },
        data: { status: 'paid' },
      });
    }
  }

  async initiatePosPayment(invoiceId: string, requester: JwtPayload) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id: invoiceId },
    });
    if (!invoice) throw new NotFoundException('INVOICE_NOT_FOUND');
    this.assertBranchAccess(invoice.branchId, requester);

    const sessionId = `pos_${invoiceId}_${Date.now()}`;
    return { sessionId, status: 'pending', invoiceId, amount: invoice.total };
  }

  getPosStatus(sessionId: string) {
    return { sessionId, status: 'succeeded' };
  }

  async getReconciliation(
    startDate: string,
    endDate: string,
    branchId: string | undefined,
    requester: JwtPayload,
  ) {
    const resolvedBranchId = this.resolveBranchId(branchId, requester);
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setDate(end.getDate() + 1);

    const [invoices, payments] = await Promise.all([
      this.prisma.invoice.findMany({
        where: { branchId: resolvedBranchId, createdAt: { gte: start, lt: end } },
        include: { reservation: { select: { id: true } } },
      }),
      this.prisma.payment.findMany({
        where: {
          branchId: resolvedBranchId,
          status: 'succeeded',
          paidAt: { gte: start, lt: end },
        },
        include: { refunds: true },
      }),
    ]);

    const totalInvoiced = invoices.reduce((s, inv) => s + Number(inv.total), 0);
    const totalCollected = payments.reduce((s, p) => s + Number(p.amount), 0);
    const totalRefunded = payments.reduce(
      (s, p) =>
        s +
        p.refunds
          .filter((r) => r.status === 'succeeded')
          .reduce((rs, r) => rs + Number(r.amount), 0),
      0,
    );

    return {
      startDate,
      endDate,
      totalInvoiced,
      totalCollected,
      totalRefunded,
      netCollected: totalCollected - totalRefunded,
      invoiceCount: invoices.length,
      paymentCount: payments.length,
      invoices,
      payments,
    };
  }

  private selectProvider(provider: string) {
    switch (provider) {
      case 'stripe': return this.stripeProvider;
      case 'tranzila': return this.tranzilaProvider;
      default: return this.manualProvider;
    }
  }

  private resolveBranchId(provided: string | undefined, requester: JwtPayload): string {
    if (requester.role === 'chain_admin') {
      if (!provided) throw new BadRequestException('BRANCH_ID_REQUIRED');
      return provided;
    }
    if (!requester.branchId) throw new ForbiddenException('NO_BRANCH_ASSIGNED');
    return requester.branchId;
  }

  private assertBranchAccess(entityBranchId: string, requester: JwtPayload): void {
    if (requester.role !== 'chain_admin' && entityBranchId !== requester.branchId) {
      throw new ForbiddenException('BRANCH_ACCESS_DENIED');
    }
  }
}
