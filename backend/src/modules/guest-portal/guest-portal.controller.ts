import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
  Req,
  Res,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Response } from 'express';
import { GuestPortalService } from './guest-portal.service';
import { GuestTokenGuard, GuestPaymentTokenGuard, GuestRequest } from './guards/guest-token.guard';
import { OnlineCheckInDto } from './dto/online-check-in.dto';
import { PortalPaymentDto } from './dto/portal-payment.dto';
import { InvoicePdfService } from '../billing/pdf/invoice-pdf.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

const PORTAL_THROTTLE = { default: { limit: 20, ttl: 60000 } };

@Throttle(PORTAL_THROTTLE)
@Controller('v1/portal')
export class GuestPortalController {
  constructor(
    private readonly portalService: GuestPortalService,
    private readonly pdfService: InvoicePdfService,
  ) {}

  // ── Public: guest-facing endpoints ────────────────────────────────────────

  @UseGuards(GuestTokenGuard)
  @Get('reservation/:token')
  async getReservation(@Req() req: GuestRequest) {
    return this.portalService.getReservation(req.guestToken.reservationId);
  }

  @UseGuards(GuestTokenGuard)
  @Get('reservation/:token/invoice')
  async getInvoice(@Req() req: GuestRequest) {
    return this.portalService.getInvoiceDetail(req.guestToken.reservationId);
  }

  @UseGuards(GuestTokenGuard)
  @Get('reservation/:token/invoice/pdf')
  async getInvoicePdf(@Req() req: GuestRequest, @Res() res: Response) {
    const invoice = await this.portalService.getInvoiceDetail(req.guestToken.reservationId);
    await this.pdfService.stream(invoice.id, null, res, { guestPortal: true });
  }

  @UseGuards(GuestTokenGuard)
  @Post('reservation/:token/check-in')
  @HttpCode(HttpStatus.OK)
  async submitCheckIn(
    @Req() req: GuestRequest,
    @Body() dto: OnlineCheckInDto,
  ) {
    return this.portalService.submitOnlineCheckIn(
      req.guestToken.reservationId,
      req.guestToken.guestId,
      dto,
    );
  }

  @UseGuards(GuestPaymentTokenGuard)
  @Post('reservation/:token/payment')
  @HttpCode(HttpStatus.OK)
  async processPayment(
    @Req() req: GuestRequest,
    @Body() dto: PortalPaymentDto,
  ) {
    return this.portalService.processPortalPayment(
      req.guestToken.reservationId,
      req.guestToken.tokenId,
      dto,
    );
  }

  // ── Staff: admin endpoints ─────────────────────────────────────────────────

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('chain_admin', 'hotel_manager', 'receptionist')
  @Post('send-link/:reservationId')
  @HttpCode(HttpStatus.OK)
  async sendPortalLink(
    @Param('reservationId') reservationId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.portalService.sendPortalLinkByStaff(reservationId, user);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('chain_admin', 'hotel_manager')
  @Get('tokens/:reservationId')
  async listTokens(
    @Param('reservationId') reservationId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.portalService.listActiveTokens(reservationId, user);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('chain_admin', 'hotel_manager')
  @Post('tokens/:reservationId/revoke')
  @HttpCode(HttpStatus.OK)
  async revokeTokens(
    @Param('reservationId') reservationId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.portalService.revokeAllTokens(reservationId, user);
  }
}
