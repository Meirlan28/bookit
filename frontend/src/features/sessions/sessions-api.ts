import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiRequest } from '../../lib/api-client';
import type { MessageResponse, Session } from '../../types/api';

const sessionKeys = {
  all: ['sessions'] as const,
};

export function useSessions() {
  return useQuery({
    queryKey: sessionKeys.all,
    queryFn: () => apiRequest<Session[]>('/api/v1/auth/sessions'),
  });
}

export function useTerminateOtherSessions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () =>
      apiRequest<MessageResponse>('/api/v1/auth/sessions/others', {
        method: 'DELETE',
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: sessionKeys.all }),
  });
}
