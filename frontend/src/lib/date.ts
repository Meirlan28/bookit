import {
  addMinutes,
  differenceInMinutes,
  format,
  isSameDay,
  roundToNearestMinutes,
} from 'date-fns';
import { ru } from 'date-fns/locale';

export function formatDate(value: string | Date, pattern = 'd MMMM'): string {
  return format(new Date(value), pattern, { locale: ru });
}

export function formatBookingDate(start: string, end: string): string {
  const startDate = new Date(start);
  const endDate = new Date(end);

  if (isSameDay(startDate, endDate)) {
    return `${format(startDate, 'd MMMM, EEE', { locale: ru })} · ${format(startDate, 'HH:mm')}–${format(endDate, 'HH:mm')}`;
  }

  return `${format(startDate, 'd MMM, HH:mm', { locale: ru })} — ${format(endDate, 'd MMM, HH:mm', { locale: ru })}`;
}

export function formatDuration(start: string | Date, end: string | Date): string {
  const totalMinutes = Math.max(
    0,
    differenceInMinutes(new Date(end), new Date(start)),
  );
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (!hours) return `${minutes} мин`;
  if (!minutes) return `${hours} ч`;
  return `${hours} ч ${minutes} мин`;
}

export function toDateTimeLocal(date: Date): string {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

export function getDefaultBookingRange(): { start: string; end: string } {
  const rounded = roundToNearestMinutes(addMinutes(new Date(), 30), {
    nearestTo: 30,
    roundingMethod: 'ceil',
  });

  return {
    start: toDateTimeLocal(rounded),
    end: toDateTimeLocal(addMinutes(rounded, 60)),
  };
}

export function isUpcoming(value: string): boolean {
  return new Date(value).getTime() > Date.now();
}
