import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { CreateChargeDto } from './dto/create-charge.dto';

const TAX_RATE = 0.17;

@Injectable()
export class ChargeService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  async addCharge(dto: CreateChargeDto, requester: JwtPayload) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id: dto.invoiceId },
      include: { lineItems: true, charges: true },
    });
    if (!invoice) throw new NotFoundException('INVOICE_NOT_FOUND');
    this.assertBranchAccess(invoice.branchId, requester);

    if (invoice.status === 'void') {
      throw new BadRequestException('INVOICE_VOID');
    }

    // dto.amount is the VAT-inclusive (gross) price shown to the guest.
    // Extract net before adding to subtotal so tax is not double-counted.
    const grossAmount = new Prisma.Decimal(dto.amount);
    const netAmount = grossAmount
      .div(new Prisma.Decimal(1).add(new Prisma.Decimal(TAX_RATE)))
      .toDecimalPlaces(2);
    const newSubtotal = new Prisma.Decimal(invoice.subtotal).add(netAmount);
    const newTax = newSubtotal.mul(new Prisma.Decimal(TAX_RATE)).toDecimalPlaces(2);
    const newTotal = newSubtotal.add(newTax);

    const result = await this.prisma.$transaction(async (tx) => {
      const charge = await tx.charge.create({
        data: {
          branchId: invoice.branchId,
          invoiceId: dto.invoiceId,
          description: dto.description,
          amount: netAmount,
          chargeType: dto.chargeType,
          addedBy: requester.sub,
        },
      });

      await tx.invoiceLineItem.create({
        data: {
          invoiceId: dto.invoiceId,
          description: dto.description,
          quantity: 1,
          unitPrice: netAmount,
          total: netAmount,
          itemType: 'other',
        },
      });

      const updatedInvoice = await tx.invoice.update({
        where: { id: dto.invoiceId },
        data: {
          subtotal: newSubtotal,
          tax: newTax,
          total: newTotal,
          // Reopen paid invoice so remaining balance can be collected at checkout
          ...(invoice.status === 'paid' ? { status: 'finalized' } : {}),
        },
        include: { lineItems: true, charges: true },
      });

      return { charge, invoice: updatedInvoice };
    });

    await this.audit.log({
      userId: requester.sub,
      action: 'CHARGE_ADDED',
      entityType: 'invoice',
      entityId: dto.invoiceId,
      branchId: invoice.branchId,
      metadata: {
        chargeType: dto.chargeType,
        amount: dto.amount,
        description: dto.description,
      },
    });

    return result;
  }

  async applyDiscount(invoiceId: string, discountAmount: number, description: string, requester: JwtPayload) {
    const invoice = await this.prisma.invoice.findUnique({ where: { id: invoiceId } });
    if (!invoice) throw new NotFoundException('INVOICE_NOT_FOUND');
    this.assertBranchAccess(invoice.branchId, requester);

    if (invoice.status === 'void') throw new BadRequestException('INVOICE_VOID');
    if (invoice.status === 'paid') throw new BadRequestException('INVOICE_ALREADY_PAID');

    const discount = new Prisma.Decimal(discountAmount);
    if (discount.lte(0)) throw new BadRequestException('DISCOUNT_MUST_BE_POSITIVE');
    if (discount.gt(invoice.total)) throw new BadRequestException('DISCOUNT_EXCEEDS_TOTAL');

    const newTotal = new Prisma.Decimal(invoice.total).sub(discount);

    const result = await this.prisma.$transaction(async (tx) => {
      await tx.invoiceLineItem.create({
        data: {
          invoiceId,
          description: description || 'הנחה/זיכוי',
          quantity: 1,
          unitPrice: discount.neg(),
          total: discount.neg(),
          itemType: 'other',
        },
      });

      return tx.invoice.update({
        where: { id: invoiceId },
        data: { total: newTotal },
        include: { lineItems: true },
      });
    });

    await this.audit.log({
      userId: requester.sub,
      action: 'DISCOUNT_APPLIED',
      entityType: 'invoice',
      entityId: invoiceId,
      branchId: invoice.branchId,
      metadata: { discountAmount, description },
    });

    return result;
  }

  private assertBranchAccess(entityBranchId: string, requester: JwtPayload): void {
    if (requester.role !== 'chain_admin' && entityBranchId !== requester.branchId) {
      throw new ForbiddenException('BRANCH_ACCESS_DENIED');
    }
  }
}
