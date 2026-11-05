/**
 * Virtual Economy & Rewards Calculations
 * Enforces transaction integrity, daily reward streaks, and coin limits.
 */

export interface CoinBalance {
  userId: string;
  coins: number;
  lastDailyClaimTimestamp?: number;
  dailyStreak: number;
}

export interface PurchaseValidationResult {
  success: boolean;
  newBalance?: number;
  error?: string;
}

/**
 * Calculates daily reward coin payout based on streak day (1 to 7).
 * Day 1: 100 coins
 * Day 2: 150 coins
 * Day 3: 200 coins
 * Day 4: 250 coins
 * Day 5: 350 coins
 * Day 6: 500 coins
 * Day 7 (Jackpot): 1,000 coins
 */
export function calculateDailyRewardAmount(streakDay: number): number {
  const normalizedDay = ((streakDay - 1) % 7) + 1;
  const rewardTable: Record<number, number> = {
    1: 100,
    2: 150,
    3: 200,
    4: 250,
    5: 350,
    6: 500,
    7: 1000,
  };
  return rewardTable[normalizedDay] ?? 100;
}

const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const TWO_DAYS_MS = 48 * 60 * 60 * 1000;

/**
 * Evaluates whether a user is currently eligible to claim their daily reward,
 * and calculates the new streak count.
 */
export function evaluateDailyRewardClaim(
  lastClaimTimestamp: number | undefined,
  currentStreak: number,
  nowTimestamp: number = Date.now()
): { eligible: boolean; nextStreak: number; reward: number; cooldownRemainingMs: number } {
  if (!lastClaimTimestamp) {
    const reward = calculateDailyRewardAmount(1);
    return {
      eligible: true,
      nextStreak: 1,
      reward,
      cooldownRemainingMs: 0,
    };
  }

  const elapsed = nowTimestamp - lastClaimTimestamp;

  if (elapsed < ONE_DAY_MS) {
    return {
      eligible: false,
      nextStreak: currentStreak,
      reward: 0,
      cooldownRemainingMs: ONE_DAY_MS - elapsed,
    };
  }

  // If claimed within 48 hours, streak continues; otherwise resets to 1
  const streakContinues = elapsed < TWO_DAYS_MS;
  const nextStreak = streakContinues ? currentStreak + 1 : 1;
  const reward = calculateDailyRewardAmount(nextStreak);

  return {
    eligible: true,
    nextStreak,
    reward,
    cooldownRemainingMs: 0,
  };
}

/**
 * Validates a virtual shop purchase transaction.
 */
export function validatePurchase(
  currentBalance: number,
  itemPrice: number,
  alreadyOwned: boolean
): PurchaseValidationResult {
  if (alreadyOwned) {
    return { success: false, error: 'You already own this item.' };
  }

  if (itemPrice < 0) {
    return { success: false, error: 'Invalid item price.' };
  }

  if (currentBalance < itemPrice) {
    return {
      success: false,
      error: `Insufficient coins. You have ${currentBalance} coins, but need ${itemPrice}.`
    };
  }

  return {
    success: true,
    newBalance: currentBalance - itemPrice,
  };
}
