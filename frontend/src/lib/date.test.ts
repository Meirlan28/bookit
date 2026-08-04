import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  formatBookingDate,
  formatDate,
  formatDuration,
  getDefaultBookingRange,
  isUpcoming,
  toDateTimeLocal,
} from './date';

describe('date helpers', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('formats dates and same-day bookings in Russian', () => {
    expect(formatDate(new Date(2026, 2, 14, 9), 'd MMMM yyyy')).toBe(
      '14 марта 2026',
    );
    expect(
      formatBookingDate('2026-03-14T09:00:00', '2026-03-14T10:30:00'),
    ).toBe('14 марта, суб · 09:00–10:30');
  });

  it('includes both dates when a booking crosses a day boundary', () => {
    expect(
      formatBookingDate('2026-03-14T09:00:00', '2026-03-15T11:15:00'),
    ).toBe('14 мар., 09:00 — 15 мар., 11:15');
  });

  it.each([
    [new Date(2026, 0, 1, 10), new Date(2026, 0, 1, 10, 45), '45 мин'],
    [new Date(2026, 0, 1, 10), new Date(2026, 0, 1, 12), '2 ч'],
    [new Date(2026, 0, 1, 10), new Date(2026, 0, 1, 12, 25), '2 ч 25 мин'],
    [new Date(2026, 0, 1, 10), new Date(2026, 0, 1, 9), '0 мин'],
  ])('formats a duration as hours and minutes', (start, end, expected) => {
    expect(formatDuration(start, end)).toBe(expected);
  });

  it('converts a Date to the datetime-local format without shifting local time', () => {
    expect(toDateTimeLocal(new Date(2026, 6, 9, 4, 5))).toBe(
      '2026-07-09T04:05',
    );
  });

  it('builds the default one-hour range on the next half-hour boundary', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 6, 9, 10, 10));

    expect(getDefaultBookingRange()).toEqual({
      start: '2026-07-09T11:00',
      end: '2026-07-09T12:00',
    });
  });

  it('recognizes only timestamps strictly later than now as upcoming', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-09T10:00:00Z'));

    expect(isUpcoming('2026-07-09T10:00:01Z')).toBe(true);
    expect(isUpcoming('2026-07-09T10:00:00Z')).toBe(false);
    expect(isUpcoming('2026-07-09T09:59:59Z')).toBe(false);
  });
});
