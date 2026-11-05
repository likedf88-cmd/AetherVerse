import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateDailyRewardAmount,
  evaluateDailyRewardClaim,
  validatePurchase
} from './economy';

test('calculateDailyRewardAmount provides escalating rewards and day 7 jackpot', () => {
  assert.equal(calculateDailyRewardAmount(1), 100);
  assert.equal(calculateDailyRewardAmount(2), 150);
  assert.equal(calculateDailyRewardAmount(6), 500);
  assert.equal(calculateDailyRewardAmount(7), 1000);
  // Cycle back on day 8
  assert.equal(calculateDailyRewardAmount(8), 100);
});

test('evaluateDailyRewardClaim prevents duplicate claims within 24 hours', () => {
  const now = Date.now();
  const twelveHoursAgo = now - 12 * 60 * 60 * 1000;
  const result = evaluateDailyRewardClaim(twelveHoursAgo, 2, now);
  assert.equal(result.eligible, false);
  assert.equal(result.reward, 0);
  assert.ok(result.cooldownRemainingMs > 0);
});

test('evaluateDailyRewardClaim advances streak after 24 hours and before 48 hours', () => {
  const now = Date.now();
  const twentyFiveHoursAgo = now - 25 * 60 * 60 * 1000;
  const result = evaluateDailyRewardClaim(twentyFiveHoursAgo, 3, now);
  assert.equal(result.eligible, true);
  assert.equal(result.nextStreak, 4);
  assert.equal(result.reward, 250);
});

test('evaluateDailyRewardClaim resets streak if more than 48 hours have elapsed', () => {
  const now = Date.now();
  const threeDaysAgo = now - 72 * 60 * 60 * 1000;
  const result = evaluateDailyRewardClaim(threeDaysAgo, 5, now);
  assert.equal(result.eligible, true);
  assert.equal(result.nextStreak, 1);
  assert.equal(result.reward, 100);
});

test('validatePurchase checks balance and prevents double purchase', () => {
  assert.equal(validatePurchase(500, 300, false).success, true);
  assert.equal(validatePurchase(500, 300, false).newBalance, 200);

  // Insufficient funds
  const failFunds = validatePurchase(200, 300, false);
  assert.equal(failFunds.success, false);

  // Already owned
  const failOwned = validatePurchase(1000, 100, true);
  assert.equal(failOwned.success, false);
});
