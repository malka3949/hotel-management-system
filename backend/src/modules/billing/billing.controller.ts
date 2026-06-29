import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  Query,
  UseGuards,
  Req,
  Headers,
  Res,
  RawBodyRequest,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { Request, Response } from 'express';
import { PaymentService } from './payment.service';
import { ChargeService } from './charge.service';
import { RefundService } from './refund.service';
import { InvoicePdfService } from './pdf/invoice-pdf.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { CreateChargeDto } from './dto/create-charge.dto';
import { CreateRefundDto } from './dto/create-refund.dto';
import { PrePaymentDto } from './dto/pre-payment.dto';

@Controller()
export class BillingController {
  constructor(
    private paymentService: PaymentService,
    private chargeService: ChargeService,
    private refundService: RefundService,
    private invoicePdfService: InvoicePdfService,
  ) {}

  // ── Payments ────────────────────────────────────────────────────────────────

  @Post('v1/payments')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('chain_admin', 'hotel_manager', 'receptionist')
  initiatePayment(
    @Body() dto: CreatePaymentDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.paymentService.initiatePayment(dto, user);
  }

  @Get('v1/payments/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('chain_admin', 'hotel_manager', 'receptionist')
  getPayment(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.paymentService.getPayment(id, user);
  }

  // ── Stripe Webhook (no auth) ─────────────────────────────────────────────────

  @Post('v1/payments/webhook/stripe')
  @SkipThrottle()
  @HttpCode(HttpStatus.OK)
  async handleStripeWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') sig: string,
  ) {
    const rawBody = req.rawBody ?? Buffer.from('');
    await this.paymentService.handleStripeWebhook(rawBody, sig);
    return { received: true };
  }

  // ── POS ──────────────────────────────────────────────────────────────────────

  @Post('v1/payments/pos')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('chain_admin', 'hotel_manager', 'receptionist')
  initiatePosPayment(
    @Body('invoiceId') invoiceId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.paymentService.initiatePosPayment(invoiceId, user);
  }

  @Get('v1/payments/pos/:sessionId/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('chain_admin', 'hotel_manager', 'receptionist')
  getPosStatus(@Param('sessionId') sessionId: string) {
    return this.paymentService.getPosStatus(sessionId);
  }

  // ── Pre-payment ───────────────────────────────────────────────────────────────

  @Post('v1/reservations/:id/pre-payment')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('chain_admin', 'hotel_manager', 'receptionist')
  initiatePrePayment(
    @Param('id') reservationId: string,
    @Body() dto: PrePaymentDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.paymentService.initiatePrePayment(reservationId, dto, user);
  }

  // ── Invoices ──────────────────────────────────────────────────────────────────

  @Get('v1/invoices/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('chain_admin', 'hotel_manager', 'receptionist')
  getInvoiceById(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.paymentService.getInvoiceById(id, user);
  }

  @Get('v1/invoices/:id/payments')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('chain_admin', 'hotel_manager', 'receptionist')
  getInvoicePayments(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.paymentService.getInvoicePayments(id, user);
  }

  @Get('v1/invoices/:id/pdf')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('chain_admin', 'hotel_manager', 'receptionist')
  async downloadPdf(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Res() res: Response,
  ) {
    await this.invoicePdfService.stream(id, user, res);
  }

  @Post('v1/invoices/:id/send-email')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('chain_admin', 'hotel_manager', 'receptionist')
  sendInvoiceByEmail(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.invoicePdfService.sendByEmail(id, user);
  }

  // ── Charges ───────────────────────────────────────────────────────────────────

  @Post('v1/charges')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('chain_admin', 'hotel_manager', 'receptionist')
  addCharge(@Body() dto: CreateChargeDto, @CurrentUser() user: JwtPayload) {
    return this.chargeService.addCharge(dto, user);
  }

  // ── Refunds ───────────────────────────────────────────────────────────────────

  @Post('v1/refunds')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('chain_admin', 'hotel_manager')
  initiateRefund(@Body() dto: CreateRefundDto, @CurrentUser() user: JwtPayload) {
    return this.refundService.initiateRefund(dto, user);
  }

  @Get('v1/refunds/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('chain_admin', 'hotel_manager', 'receptionist')
  getRefund(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.refundService.getRefund(id, user);
  }

  // ── Reports ───────────────────────────────────────────────────────────────────

  @Get('v1/reports/payment-reconciliation')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('chain_admin', 'hotel_manager')
  getReconciliation(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('branchId') branchId: string | undefined,
    @CurrentUser() user: JwtPayload,
  ) {
    const today = new Date().toISOString().slice(0, 10);
    return this.paymentService.getReconciliation(
      startDate ?? today,
      endDate ?? today,
      branchId,
      user,
    );
  }
}
