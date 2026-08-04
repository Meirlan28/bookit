import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiRequest } from '../../lib/api-client';
import type { Booking, Room } from '../../types/api';
import { bookingKeys } from '../bookings/bookings-api';
import { roomKeys } from '../rooms/rooms-api';
import type {
  AdminBooking,
  AdminBookingListParams,
  AdminListParams,
  AdminRoomInput,
  AdminRoomPatch,
  AdminStats,
  AdminStatsPayload,
  AdminUser,
  AdminUserPatch,
  PaginatedResponse,
} from './admin-types';

const ADMIN_BASE = '/api/v1/admin';

export const adminKeys = {
  root: ['admin'] as const,
  stats: ['admin', 'stats'] as const,
  usersRoot: ['admin', 'users'] as const,
  users: (params: AdminListParams) => ['admin', 'users', params] as const,
  bookingsRoot: ['admin', 'bookings'] as const,
  bookings: (params: AdminBookingListParams) => ['admin', 'bookings', params] as const,
};

function listQuery(params: AdminListParams): URLSearchParams {
  const query = new URLSearchParams({
    page: String(params.page),
    page_size: String(params.pageSize),
  });
  const search = params.search.trim();
  if (search) query.set('search', search);
  return query;
}

async function invalidateAdminSummary(queryClient: ReturnType<typeof useQueryClient>) {
  await queryClient.invalidateQueries({ queryKey: adminKeys.stats });
}

export function useAdminStats() {
  return useQuery({
    queryKey: adminKeys.stats,
    queryFn: async (): Promise<AdminStats> => {
      const payload = await apiRequest<AdminStatsPayload>(`${ADMIN_BASE}/stats`);
      return {
        ...payload,
        bookings_today: payload.bookings_today ?? payload.today_bookings ?? 0,
      };
    },
  });
}

export function useAdminUsers(params: AdminListParams) {
  return useQuery({
    queryKey: adminKeys.users(params),
    queryFn: () =>
      apiRequest<PaginatedResponse<AdminUser>>(
        `${ADMIN_BASE}/users?${listQuery(params).toString()}`,
      ),
    placeholderData: (previous) => previous,
  });
}

export function useUpdateAdminUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, input }: { userId: number; input: AdminUserPatch }) =>
      apiRequest<AdminUser>(`${ADMIN_BASE}/users/${userId}`, {
        method: 'PATCH',
        body: input,
      }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: adminKeys.usersRoot }),
        invalidateAdminSummary(queryClient),
      ]);
    },
  });
}

export function useAdminBookings(params: AdminBookingListParams) {
  return useQuery({
    queryKey: adminKeys.bookings(params),
    queryFn: () => {
      const query = listQuery(params);
      query.set('status', params.status);
      return apiRequest<PaginatedResponse<AdminBooking>>(
        `${ADMIN_BASE}/bookings?${query.toString()}`,
      );
    },
    placeholderData: (previous) => previous,
  });
}

export function useDeleteAdminBooking() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (bookingId: number) =>
      apiRequest<void>(`${ADMIN_BASE}/bookings/${bookingId}`, { method: 'DELETE' }),
    onSuccess: async (_, bookingId) => {
      queryClient.setQueriesData<PaginatedResponse<AdminBooking>>(
        { queryKey: adminKeys.bookingsRoot },
        (page) => {
          if (!page) return page;
          const wasOnPage = page.items.some((booking) => booking.id === bookingId);
          return {
            ...page,
            items: page.items.filter((booking) => booking.id !== bookingId),
            total: wasOnPage ? Math.max(0, page.total - 1) : page.total,
          };
        },
      );
      queryClient.setQueryData<Booking[]>(bookingKeys.all, (bookings) =>
        bookings?.filter((booking) => booking.id !== bookingId),
      );
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: adminKeys.bookingsRoot }),
        invalidateAdminSummary(queryClient),
      ]);
    },
  });
}

export function useCreateAdminRoom() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: AdminRoomInput) =>
      apiRequest<Room>('/api/v1/rooms', { method: 'POST', body: input }),
    onSuccess: async (room) => {
      queryClient.setQueryData<Room[]>(roomKeys.all, (rooms = []) => [...rooms, room]);
      queryClient.setQueryData(roomKeys.detail(room.id), room);
      await invalidateAdminSummary(queryClient);
    },
  });
}

export function useUpdateAdminRoom() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ roomId, input }: { roomId: number; input: AdminRoomPatch }) =>
      apiRequest<Room>(`${ADMIN_BASE}/rooms/${roomId}`, {
        method: 'PATCH',
        body: input,
      }),
    onSuccess: async (updatedRoom) => {
      queryClient.setQueryData<Room[]>(roomKeys.all, (rooms = []) =>
        rooms.map((room) => room.id === updatedRoom.id ? updatedRoom : room),
      );
      queryClient.setQueryData(roomKeys.detail(updatedRoom.id), updatedRoom);
      await queryClient.invalidateQueries({ queryKey: adminKeys.bookingsRoot });
    },
  });
}

export function useDeleteAdminRoom() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (roomId: number) =>
      apiRequest<void>(`${ADMIN_BASE}/rooms/${roomId}`, { method: 'DELETE' }),
    onSuccess: async (_, roomId) => {
      queryClient.setQueryData<Room[]>(roomKeys.all, (rooms) =>
        rooms?.filter((room) => room.id !== roomId),
      );
      queryClient.removeQueries({ queryKey: roomKeys.detail(roomId) });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: adminKeys.bookingsRoot }),
        invalidateAdminSummary(queryClient),
      ]);
    },
  });
}
