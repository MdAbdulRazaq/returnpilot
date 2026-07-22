// Failed payment handler
// Based on PRICE-XXX: Failed payment handling (3-day/7-day retry attempts, suspension after 3 failures)

/**
 * Handle failed payment attempts
 * @param failedAttempts Number of consecutive failed payment attempts
 * @returns Object indicating the next action to take
 */
export function handleFailedPayment(failedAttempts: number): {
  action: 'retry' | 'suspend';
  retryInDays?: number;
  reason: string;
} {
  if (failedAttempts >= 3) {
    return {
      action: 'suspend',
      reason: 'Account suspended after 3 failed payment attempts'
    };
  }

  // Determine retry interval based on attempt number
  let retryInDays: number;
  if (failedAttempts === 1) {
    retryInDays = 3; // First retry after 3 days
  } else if (failedAttempts === 2) {
    retryInDays = 7; // Second retry after 7 days
  } else {
    // This should not happen due to the check above, but for safety
    retryInDays = 7;
  }

  return {
    action: 'retry',
    retryInDays,
    reason: `Payment failed. Retry in ${retryInDays} day(s).`
  };
}