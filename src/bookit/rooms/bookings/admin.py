from sqladmin import ModelView

from .models import Booking


class BookingAdmin(ModelView, model=Booking):
    column_list = [
        Booking.id,
        Booking.user_id,
        Booking.room_id,
        Booking.start_time,
        Booking.end_time,
    ]
    column_sortable_list = [Booking.start_time]
    icon = "fa-solid fa-calendar"
    column_sortable_list = [Booking.start_time]
    icon = "fa-solid fa-calendar"
