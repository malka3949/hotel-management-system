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

    if (invoice.status === 'paid') {
      throw new BadRequestException('INVOICE_ALREADY_PAID');
    }
    if (invoice.status === 'void') {
      throw new BadRequestException('INVOICE_VOID');
    }

    const chargeAmount = new Prisma.Decimal(dto.amount);
    const newSubtotal = new Prisma.Decimal(invoice.subtotal).add(chargeAmount);
    const newTax = newSubtotal.mul(new Prisma.Decimal(TAX_RATE)).toDecimalPlaces(2);
    const newTotal = newSubtotal.add(newTax);

    const result = await this.prisma.$transaction(async (tx) => {
      const charge = await tx.charge.create({
        data: {
          branchId: invoice.branchId,
          invoiceId: dto.invoiceId,
          description: dto.description,
          amount: chargeAmount,
          chargeType: dto.chargeType,
          addedBy: requester.sub,
        },
      });

      await tx.invoiceLineItem.create({
        data: {
          invoiceId: dto.invoiceId,
          description: dto.description,
          quantity: 1,
          unitPrice: chargeAmount,
          total: chargeAmount,
          itemType: 'other',
        },
      });

      const updatedInvoice = await tx.invoice.update({
        where: { id: dto.invoiceId },
        data: { subtotal: newSubtotal, tax: newTax, total: newTotal },
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

  private assertBranchAccess(entityBranchId: string, requester: JwtPayload): void {
    if (requester.role !== 'chain_admin' && entityBranchId !== requester.branchId) {
      throw new ForbiddenException('BRANCH_ACCESS_DENIED');
    }
  }
}
