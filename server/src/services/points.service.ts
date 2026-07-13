import { AppError } from '../utils/AppError.js';
import { pointsRepository } from '../repositories/points.repository.js';
import type { RedeemPointsInput } from '../validators/points.validators.js';

// Earn rate: 1 point per ₹10 spent on a completed booking.
const EARN_RATE_RUPEES_PER_POINT = 10;
// Redemption rate: 1 point = ₹1 of redeemable value.
const REDEEM_VALUE_PER_POINT = 1;
const MIN_REDEEM_POINTS = 100;

export const pointsService = {
  async getSummary(userId: string) {
    const [balance, history] = await Promise.all([
      pointsRepository.getBalance(userId),
      pointsRepository.listHistory(userId),
    ]);
    return {
      balance,
      redeemableValue: balance * REDEEM_VALUE_PER_POINT,
      minRedeemPoints: MIN_REDEEM_POINTS,
      earnRate: `1 point per ₹${EARN_RATE_RUPEES_PER_POINT} spent`,
      history,
    };
  },

  /**
   * Award points for a completed booking. Idempotent — a booking can only earn points once,
   * even if this is called more than once for the same booking.
   */
  async earnForBooking(userId: string, bookingId: string, priceRupees: number) {
    const already = await pointsRepository.findByBooking(userId, bookingId, 'earn');
    if (already) return already;

    const points = Math.floor(priceRupees / EARN_RATE_RUPEES_PER_POINT);
    if (points <= 0) return null;

    return pointsRepository.addEntry({
      userId,
      bookingId,
      type: 'earn',
      points,
      description: `Earned from completed booking`,
    });
  },

  async redeem(userId: string, input: RedeemPointsInput) {
    const balance = await pointsRepository.getBalance(userId);
    if (input.points > balance) {
      throw AppError.badRequest(`Insufficient points. You have ${balance} points available.`);
    }

    const redeemedValue = input.points * REDEEM_VALUE_PER_POINT;
    const entry = await pointsRepository.addEntry({
      userId,
      bookingId: null,
      type: 'redeem',
      points: -input.points,
      description: `Redeemed ${input.points} points for ₹${redeemedValue}`,
    });

    const newBalance = balance - input.points;
    return { entry, redeemedValue, balance: newBalance };
  },
};
