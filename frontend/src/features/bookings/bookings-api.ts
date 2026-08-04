import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiRequest } from '../../lib/api-client';
import type { Booking, BookingInput } from '../../types/api';

export const bookingKeys = {
  all: ['bookings'] as const,
};

export function useBookings() {
  return useQuery({
    queryKey: bookingKeys.all,
    queryFn: () => apiRequest<Booking[]>('/api/v1/bookings'),
  });
}

export function useCreateBooking(roomId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: BookingInput) =>
      apiRequest<Booking>(`/api/v1/rooms/${roomId}/bookings`, {
        method: 'POST',
        body: input,
      }),
    onSuccess: async (booking) => {
      const cachedBookings = queryClient.getQueryData<Booking[]>(bookingKeys.all);
      if (cachedBookings) {
        queryClient.setQueryData<Booking[]>(bookingKeys.all, [
          booking,
          ...cachedBookings,
        ]);
      }
      await queryClient.invalidateQueries({ queryKey: bookingKeys.all });
    },
  });
}

export function useDeleteBooking() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (bookingId: number) =>
      apiRequest<void>(`/api/v1/bookings/${bookingId}`, { method: 'DELETE' }),
    onSuccess: (_, bookingId) => {
      queryClient.setQueryData<Booking[]>(bookingKeys.all, (bookings = []) =>
        bookings.filter((booking) => booking.id !== bookingId),
      );
    },
  });
}
