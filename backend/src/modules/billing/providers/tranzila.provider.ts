import { Injectable, NotImplementedException } from '@nestjs/common';
import {
  IPaymentProvider,
  ChargeResult,
  RefundResult,
} from './payment-provider.interface';

@Injectable()
export class TranzilaProvider implements IPaymentProvider {
  async charge(
    _amount: number,
    _currency: string,
    _token: string,
    _idempotencyKey: string,
  ): Promise<ChargeResult> {
    throw new NotImplementedException('TRANZILA_NOT_IMPLEMENTED');
  }

  async refund(_providerPaymentId: string, _amount: number): Promise<RefundResult> {
    throw new NotImplementedException('TRANZILA_REFUND_NOT_IMPLEMENTED');
  }
}
