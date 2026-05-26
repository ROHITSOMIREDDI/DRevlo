/**
 * Returns a Date object set to midnight UTC representing the calendar day (YYYY-MM-DD)
 * of a given date converted to a specific timezone.
 */
export function getLocalDateInTimezone(date: Date, timezone: string = 'UTC'): Date {
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    
    const parts = formatter.formatToParts(date);
    const year = parts.find((p) => p.type === 'year')?.value;
    const month = parts.find((p) => p.type === 'month')?.value;
    const day = parts.find((p) => p.type === 'day')?.value;

    if (!year || !month || !day) {
      throw new Error('Failed to parse date parts');
    }

    // Return Date object representing the midnight of the calendar day
    return new Date(`${year}-${month}-${day}T00:00:00.000Z`);
  } catch (error) {
    console.error(`Error formatting date in timezone ${timezone}:`, error);
    // Fallback to UTC calendar day
    const utcYear = date.getUTCFullYear();
    const utcMonth = String(date.getUTCMonth() + 1).padStart(2, '0');
    const utcDay = String(date.getUTCDate()).padStart(2, '0');
    return new Date(`${utcYear}-${utcMonth}-${utcDay}T00:00:00.000Z`);
  }
}
