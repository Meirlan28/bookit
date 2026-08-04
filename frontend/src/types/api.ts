export type UserRole = 'user' | 'admin';

export interface User {
  id: number;
  email: string;
  is_active: boolean;
  is_verified: boolean;
  role: UserRole;
}

export interface Room {
  id: number;
  name: string;
  capacity: number;
  description: string | null;
  has_projector: boolean;
  has_whiteboard: boolean;
}

export interface RoomInput {
  name: string;
  capacity: number;
  description?: string | null;
  has_projector: boolean;
  has_whiteboard: boolean;
}

export interface Booking {
  id: number;
  user_id: number;
  room_id: number;
  start_time: string;
  end_time: string;
  created_at: string;
}

export interface BookingInput {
  start_time: string;
  end_time: string;
}

export interface Session {
  id: number;
  ip_address: string | null;
  user_agent: string | null;
  last_activity: string;
  expires_at: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
}

export interface MessageResponse {
  message?: string;
  detail?: string;
}
