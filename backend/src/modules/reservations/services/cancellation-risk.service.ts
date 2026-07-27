import { Injectable } from '@nestjs/common';

interface ReservationForRisk {
  checkInDate: Date;
  createdAt: Date;
  status: string;
  invoice?: { payments?: unknown[] } | null;
  // guest history optional — only available when explicitly fetched
  guestCancelledCount?: number;
}

@Injectable()
export class CancellationRiskService {
  calculateRisk(reservation: ReservationForRisk): number {
    let score = 0;

    const hasPayment = (reservation.invoice?.payments?.length ?? 0) > 0;
    if (!hasPayment) score += 40;

    const now = new Date();
    const checkIn = new Date(reservation.checkInDate);
    const hoursUntilCheckIn = (checkIn.getTime() - now.getTime()) / (1000 * 60 * 60);

    if (hoursUntilCheckIn > 0 && hoursUntilCheckIn < 48) score += 25;

    const created = new Date(reservation.createdAt);
    const sameDay =
      created.toDateString() === checkIn.toDateString();
    if (sameDay) score += 20;

    if ((reservation.guestCancelledCount ?? 0) > 0) score += 15;

    // High-demand period (Israeli summer + holidays) → lower risk
    const month = checkIn.getMonth() + 1;
    if (month >= 7 && month <= 8) score -= 10;

    return Math.max(0, Math.min(100, score));
  }
}
