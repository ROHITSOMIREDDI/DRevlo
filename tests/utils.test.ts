import { describe, it, expect } from 'vitest';
import { getLocalDateInTimezone } from '../lib/timezone';

describe('Timezone Date Conversion Utility', () => {
  it('should correctly convert a UTC date to local midnight in various timezones', () => {
    // 2026-05-26 01:00:00 UTC
    // In America/New_York (UTC-4), it is still 2026-05-25 21:00:00.
    // In Asia/Kolkata (UTC+5.5), it is 2026-05-26 06:30:00.
    const date = new Date('2026-05-26T01:00:00.000Z');

    const nyDate = getLocalDateInTimezone(date, 'America/New_York');
    expect(nyDate.getUTCDate()).toBe(25);
    expect(nyDate.getUTCMonth()).toBe(4); // May (0-indexed)
    expect(nyDate.getUTCFullYear()).toBe(2026);

    const kolkataDate = getLocalDateInTimezone(date, 'Asia/Kolkata');
    expect(kolkataDate.getUTCDate()).toBe(26);
    expect(kolkataDate.getUTCMonth()).toBe(4); // May
    expect(kolkataDate.getUTCFullYear()).toBe(2026);
  });

  it('should fall back to UTC calendar date on invalid timezone', () => {
    const date = new Date('2026-05-26T12:00:00.000Z');
    const result = getLocalDateInTimezone(date, 'invalid-timezone-name');
    expect(result.getUTCDate()).toBe(26);
  });
});
