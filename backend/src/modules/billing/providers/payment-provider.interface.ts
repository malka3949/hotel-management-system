export interface ChargeResult {
  providerPaymentId: string;
  status: 'succeeded' | 'failed';
  metadata: Record<string, unknown>;
  errorCode?: string;
  errorMessage?: string;
}

export interface RefundResult {
  providerRefundId: string;
  status: 'succeeded' | 'failed';
  errorMessage?: string;
}

export interface IPaymentProvider {
  charge(
    amount: number,
    currency: string,
    token: string,
    idempotencyKey: string,
  ): Promise<ChargeResult>;
  refund(providerPaymentId: string, amount: number): Promise<RefundResult>;
}
