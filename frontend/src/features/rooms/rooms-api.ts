import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiRequest } from '../../lib/api-client';
import type { Room, RoomInput } from '../../types/api';

export const roomKeys = {
  all: ['rooms'] as const,
  detail: (id: number) => ['rooms', id] as const,
};

export function useRooms() {
  return useQuery({
    queryKey: roomKeys.all,
    queryFn: () => apiRequest<Room[]>('/api/v1/rooms', { auth: false }),
  });
}

export function useRoom(roomId: number) {
  return useQuery({
    queryKey: roomKeys.detail(roomId),
    queryFn: () => apiRequest<Room>(`/api/v1/rooms/${roomId}`, { auth: false }),
    enabled: Number.isInteger(roomId) && roomId > 0,
  });
}

export function useCreateRoom() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: RoomInput) =>
      apiRequest<Room>('/api/v1/rooms', { method: 'POST', body: input }),
    onSuccess: (room) => {
      queryClient.setQueryData<Room[]>(roomKeys.all, (rooms = []) => [
        ...rooms,
        room,
      ]);
      queryClient.setQueryData(roomKeys.detail(room.id), room);
    },
  });
}
