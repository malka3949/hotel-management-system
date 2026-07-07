export interface GuestTokenPayload {
  reservationId: string;
  guestId: string;
  tokenId: string;
  purpose: 'view' | 'checkin' | 'payment';
  expiresAt: string;
  usedAt?: Date | null;
}
