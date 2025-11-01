/**
 * Timezone utilities for Palestine Standard Time
 * Palestine uses Asia/Jerusalem timezone (UTC+2 standard, UTC+3 during daylight saving)
 */

/**
 * Get current time in Palestine timezone
 */
export const getPalestineTime = (): Date => {
  const now = new Date();
  return new Date(now.toLocaleString("en-US", {timeZone: "Asia/Jerusalem"}));
};

/**
 * Convert any date to Palestine timezone
 */
export const toPalestineTime = (date: Date): Date => {
  return new Date(date.toLocaleString("en-US", {timeZone: "Asia/Jerusalem"}));
};

/**
 * Format date for Palestine timezone display
 */
export const formatPalestineTime = (date: Date): string => {
  return date.toLocaleString("en-US", {
    timeZone: "Asia/Jerusalem",
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
};

/**
 * Check if a release date has passed in Palestine timezone
 */
export const hasReleaseDatePassed = (releaseDate: Date): boolean => {
  const palestineNow = getPalestineTime();
  const palestineReleaseDate = toPalestineTime(releaseDate);
  return palestineReleaseDate <= palestineNow;
};

/**
 * Log with both UTC and Palestine time for debugging
 */
export const logWithTimezone = (message: string, includeTime: boolean = true): void => {
  if (includeTime) {
    const now = new Date();
    const palestineTime = getPalestineTime();
    console.log(`${message} UTC: ${now.toISOString()}, Palestine: ${palestineTime.toISOString()}`);
  } else {
    console.log(message);
  }
};
