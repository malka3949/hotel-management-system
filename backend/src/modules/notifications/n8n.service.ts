import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class N8nService {
  private readonly logger = new Logger(N8nService.name);
  private readonly baseUrl = process.env.N8N_BASE_URL ?? 'http://localhost:5678';
  private readonly webhookSecret = process.env.N8N_WEBHOOK_SECRET ?? '';

  private readonly webhooks: Record<string, string> = {
    'reservation.confirmed': process.env.N8N_WEBHOOK_RESERVATION_CONFIRMED ?? '/webhook/vOZ77rpHCNDjHYrT/webhook/reservation-confirmation',
    'reservation.cancelled': process.env.N8N_WEBHOOK_RESERVATION_CANCELLED ?? '/webhook/QNz3j1O2wnsVcuhZ/webhook/reservation-cancelled',
    'checkin.completed':     process.env.N8N_WEBHOOK_CHECKIN_COMPLETED     ?? '/webhook/QZFECJcVzT1kQGOE/webhook/checkin-completed',
    'checkout.completed':    process.env.N8N_WEBHOOK_CHECKOUT_COMPLETED    ?? '/webhook/bV0rCIhujBNmM6t5/webhook/checkout-completed',
    'payment.succeeded':     process.env.N8N_WEBHOOK_PAYMENT_SUCCEEDED     ?? '/webhook/utSBBa1kFSHttSQd/webhook/payment-succeeded',
    'payment.failed':        process.env.N8N_WEBHOOK_PAYMENT_FAILED        ?? '/webhook/oA4GogDF8shlreQh/webhook/payment-failed',
    'refund.processed':      process.env.N8N_WEBHOOK_REFUND_PROCESSED      ?? '/webhook/TwIpgiQtNZLuLAcJ/webhook/refund-processed',
    'guest.portal.link':     process.env.N8N_WEBHOOK_GUEST_PORTAL_LINK     ?? '/webhook/guestPortalLink001/webhook/guest-portal-link',
  };

  async triggerEvent(event: string, payload: Record<string, unknown>): Promise<void> {
    const path = this.webhooks[event];
    if (!path) {
      this.logger.warn(`No webhook configured for event: ${event}`);
      return;
    }

    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (this.webhookSecret) {
        headers['X-Webhook-Secret'] = this.webhookSecret;
      }
      const res = await fetch(`${this.baseUrl}${path}`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ event, ...payload }),
      });
      if (!res.ok) {
        this.logger.warn(`n8n webhook ${event} returned ${res.status}`);
      }
    } catch (err) {
      // Fire-and-forget — never block the main flow
      this.logger.error(`n8n webhook ${event} failed: ${(err as Error).message}`);
    }
  }
}
