import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class N8nService {
  private readonly logger = new Logger(N8nService.name);
  private readonly baseUrl = process.env.N8N_BASE_URL ?? 'http://localhost:5678';

  private readonly webhooks: Record<string, string> = {
    'reservation.confirmed': '/webhook/vOZ77rpHCNDjHYrT/webhook/reservation-confirmation',
    'reservation.cancelled': '/webhook/QNz3j1O2wnsVcuhZ/webhook/reservation-cancelled',
    'checkin.completed': '/webhook/QZFECJcVzT1kQGOE/webhook/checkin-completed',
    'checkout.completed': '/webhook/bV0rCIhujBNmM6t5/webhook/checkout-completed',
    'payment.succeeded': '/webhook/utSBBa1kFSHttSQd/webhook/payment-succeeded',
    'payment.failed': '/webhook/oA4GogDF8shlreQh/webhook/payment-failed',
    'refund.processed': '/webhook/TwIpgiQtNZLuLAcJ/webhook/refund-processed',
    'guest.portal.link': '/webhook/guestPortalLink001/webhook/guest-portal-link',
  };

  async triggerEvent(event: string, payload: Record<string, unknown>): Promise<void> {
    const path = this.webhooks[event];
    if (!path) {
      this.logger.warn(`No webhook configured for event: ${event}`);
      return;
    }

    try {
      const res = await fetch(`${this.baseUrl}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
