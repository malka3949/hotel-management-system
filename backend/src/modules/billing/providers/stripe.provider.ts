import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import {
  IPaymentProvider,
  ChargeResult,
  RefundResult,
} from './payment-provider.interface';

@Injectable()
export class StripeProvider implements IPaymentProvider {
  private readonly stripe: Stripe | null;
  private readonly logger = new Logger(StripeProvider.name);

  constructor(config: ConfigService) {
    const key = config.get<string>('STRIPE_SECRET_KEY');
    this.stripe = key ? new Stripe(key) : null;
  }

  private getStripe(): Stripe {
    if (!this.stripe) throw new Error('STRIPE_SECRET_KEY not configured');
    return this.stripe;
  }

  async charge(
    amount: number,
    currency: string,
    token: string,
    idempotencyKey: string,
  ): Promise<ChargeResult> {
    try {
      const intent = await this.getStripe().paymentIntents.create(
        {
          amount: Math.round(amount * 100),
          currency: currency.toLowerCase(),
          payment_method: token,
          confirm: true,
          return_url: 'https://hotel.internal/payment-return',
        },
        { idempotencyKey },
      );

      const succeeded = intent.status === 'succeeded';
      return {
        providerPaymentId: intent.id,
        status: succeeded ? 'succeeded' : 'failed',
        metadata: { stripeStatus: intent.status },
      };
    } catch (err: unknown) {
      const stripeErr = err as { message?: string; code?: string };
      this.logger.error(`Stripe charge failed: ${stripeErr.message ?? 'unknown'}`);
      return {
        providerPaymentId: `stripe_failed_${Date.now()}`,
        status: 'failed',
        metadata: { error: stripeErr.message ?? 'Stripe error' },
        errorCode: stripeErr.code ?? 'STRIPE_ERROR',
        errorMessage: stripeErr.message,
      };
    }
  }

  async refund(providerPaymentId: string, amount: number): Promise<RefundResult> {
    try {
      const refund = await this.getStripe().refunds.create({
        payment_intent: providerPaymentId,
        amount: Math.round(amount * 100),
      });
      return {
        providerRefundId: refund.id,
        status: refund.status === 'succeeded' ? 'succeeded' : 'failed',
      };
    } catch (err: unknown) {
      const stripeErr = err as { message?: string };
      this.logger.error(`Stripe refund failed: ${stripeErr.message ?? 'unknown'}`);
      return {
        providerRefundId: `stripe_refund_failed_${Date.now()}`,
        status: 'failed',
        errorMessage: stripeErr.message,
      };
    }
  }

  constructWebhookEvent(
    rawBody: Buffer,
    sig: string,
    webhookSecret: string,
  ): Stripe.Event {
    return this.getStripe().webhooks.constructEvent(rawBody, sig, webhookSecret);
  }
}
