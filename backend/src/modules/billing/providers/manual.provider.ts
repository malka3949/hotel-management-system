import { Injectable } from '@nestjs/common';
import {
  IPaymentProvider,
  ChargeResult,
  RefundResult,
} from './payment-provider.interface';

// Use this token in tests to simulate a provider-level failure.
export const FAIL_TEST_TOKEN = 'FAIL_TEST_TOKEN';

@Injectable()
export class ManualProvider implements IPaymentProvider {
  async charge(
    amount: number,
    currency: string,
    token: string,
    idempotencyKey: string,
  ): Promise<ChargeResult> {
    if (token === FAIL_TEST_TOKEN) {
      return {
        providerPaymentId: `manual_failed_${idempotencyKey}`,
        status: 'failed',
        metadata: { method: 'manual' },
        errorCode: 'MANUAL_DECLINED',
        errorMessage: 'Simulated decline for testing',
      };
    }
    return {
      providerPaymentId: `manual_${idempotencyKey}`,
      status: 'succeeded',
      metadata: { method: 'manual', amount, currency },
    };
  }

  async refund(providerPaymentId: string, _amount: number): Promise<RefundResult> {
    return {
      providerRefundId: `refund_${providerPaymentId}`,
      status: 'succeeded',
    };
  }
}
