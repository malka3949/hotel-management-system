import { Injectable } from '@nestjs/common';
import {
  IPaymentProvider,
  ChargeResult,
  RefundResult,
} from './payment-provider.interface';

@Injectable()
export class TranzilaProvider implements IPaymentProvider {
  async charge(
    amount: number,
    currency: string,
    _token: string,
    idempotencyKey: string,
  ): Promise<ChargeResult> {
    // Stub — real Tranzila integration requires an Israeli merchant account and terminal.
    return {
      providerPaymentId: `tranzila_${idempotencyKey}`,
      status: 'succeeded',
      metadata: { provider: 'tranzila', amount, currency },
    };
  }

  async refund(providerPaymentId: string, _amount: number): Promise<RefundResult> {
    return {
      providerRefundId: `tranzila_refund_${providerPaymentId}`,
      status: 'succeeded',
    };
  }
}
