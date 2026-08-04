import type { Room, RoomInput, UserRole } from '../../types/api';

export type AdminSection = 'overview' | 'rooms' | 'bookings' | 'users';

export type AdminBookingStatus = 'all' | 'upcoming' | 'past';

export interface AdminStats {
  total_users: number;
  active_users: number;
  verified_users: number;
  total_rooms: number;
  total_bookings: number;
  upcoming_bookings: number;
  bookings_today: number;
}

export interface AdminStatsPayload {
  total_users: number;
  active_users: number;
  verified_users: number;
  total_rooms: number;
  total_bookings: number;
  upcoming_bookings: number;
  bookings_today?: number;
  today_bookings?: number;
}

export interface AdminUser {
  id: number;
  email: string;
  is_active: boolean;
  is_verified: boolean;
  role: UserRole;
  booking_count: number;
}

export interface AdminBooking {
  id: number;
  user_id: number;
  user_email: string;
  room_id: number;
  room_name: string;
  start_time: string;
  end_time: string;
  created_at: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  pages?: number;
}

export interface AdminListParams {
  search: string;
  page: number;
  pageSize: number;
}

export interface AdminBookingListParams extends AdminListParams {
  status: AdminBookingStatus;
}

export interface AdminUserPatch {
  role?: UserRole;
  is_active?: boolean;
}

export type AdminRoomPatch = Partial<Omit<Room, 'id'>>;

export type AdminRoomInput = RoomInput;

