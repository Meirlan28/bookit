from datetime import UTC, datetime, timedelta

from fastapi import HTTPException, status
from sqlalchemy import func, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from src.bookit.admin.schemas import (
    AdminBookingPage,
    AdminBookingResponse,
    AdminRoomUpdate,
    AdminStatsResponse,
    AdminUserPage,
    AdminUserResponse,
    AdminUserUpdate,
    BookingStatus,
)
from src.bookit.auth.models import Role, User
from src.bookit.rooms.bookings.models import Booking
from src.bookit.rooms.models import Room


class AdminService:
    def __init__(self, db: AsyncSession):
        self.db = db

    @staticmethod
    def _pages(total: int, page_size: int) -> int:
        return (total + page_size - 1) // page_size

    @staticmethod
    def _bad_request(detail: str) -> HTTPException:
        return HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=detail)

    @staticmethod
    def _not_found(resource: str) -> HTTPException:
        return HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"{resource} not found.",
        )

    async def get_stats(self) -> AdminStatsResponse:
        now = datetime.now(UTC)
        day_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        day_end = day_start + timedelta(days=1)

        statement = select(
            select(func.count(User.id))
            .select_from(User)
            .scalar_subquery()
            .label("total_users"),
            select(func.count(User.id))
            .select_from(User)
            .where(User.is_active.is_(True))
            .scalar_subquery()
            .label("active_users"),
            select(func.count(User.id))
            .select_from(User)
            .where(User.is_verified.is_(True))
            .scalar_subquery()
            .label("verified_users"),
            select(func.count(Room.id))
            .select_from(Room)
            .scalar_subquery()
            .label("total_rooms"),
            select(func.count(Booking.id))
            .select_from(Booking)
            .scalar_subquery()
            .label("total_bookings"),
            select(func.count(Booking.id))
            .select_from(Booking)
            .where(Booking.end_time > now)
            .scalar_subquery()
            .label("upcoming_bookings"),
            select(func.count(Booking.id))
            .select_from(Booking)
            .where(
                Booking.start_time < day_end,
                Booking.end_time > day_start,
            )
            .scalar_subquery()
            .label("bookings_today"),
        )
        row = (await self.db.execute(statement)).one()
        return AdminStatsResponse.model_validate(row._mapping)

    async def get_users(
        self,
        search: str | None,
        page: int,
        page_size: int,
    ) -> AdminUserPage:
        filters = []
        if search and (term := search.strip()):
            filters.append(User.email.icontains(term, autoescape=True))

        total_statement = select(func.count(User.id)).select_from(User).where(*filters)
        total = int(await self.db.scalar(total_statement) or 0)

        booking_counts = (
            select(
                Booking.user_id.label("user_id"),
                func.count(Booking.id).label("booking_count"),
            )
            .group_by(Booking.user_id)
            .subquery()
        )
        statement = (
            select(
                User,
                func.coalesce(booking_counts.c.booking_count, 0).label("booking_count"),
            )
            .outerjoin(booking_counts, booking_counts.c.user_id == User.id)
            .where(*filters)
            .order_by(User.id.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
        )
        rows = (await self.db.execute(statement)).all()
        items = [
            AdminUserResponse(
                id=user.id,
                email=user.email,
                role=user.role,
                is_active=user.is_active,
                is_verified=user.is_verified,
                booking_count=int(booking_count),
            )
            for user, booking_count in rows
        ]

        return AdminUserPage(
            items=items,
            total=total,
            page=page,
            page_size=page_size,
            pages=self._pages(total, page_size),
        )

    async def update_user(
        self,
        user_id: int,
        payload: AdminUserUpdate,
        current_admin_id: int,
    ) -> AdminUserResponse:
        user = await self.db.get(User, user_id)
        if user is None:
            raise self._not_found("User")

        changes = payload.model_dump(exclude_unset=True)
        if not changes:
            raise self._bad_request("At least one user field must be provided.")
        if any(value is None for value in changes.values()):
            raise self._bad_request("User fields cannot be null.")

        next_role = changes.get("role", user.role)
        next_is_active = changes.get("is_active", user.is_active)
        if user.id == current_admin_id and (
            next_role != Role.ADMIN or not next_is_active
        ):
            raise self._bad_request(
                "You cannot deactivate or remove the admin role from your own account."
            )

        for field, value in changes.items():
            setattr(user, field, value)

        await self.db.commit()
        await self.db.refresh(user)
        booking_count = int(
            await self.db.scalar(
                select(func.count(Booking.id)).where(Booking.user_id == user.id)
            )
            or 0
        )
        return AdminUserResponse(
            id=user.id,
            email=user.email,
            role=user.role,
            is_active=user.is_active,
            is_verified=user.is_verified,
            booking_count=booking_count,
        )

    async def get_bookings(
        self,
        search: str | None,
        booking_status: BookingStatus,
        page: int,
        page_size: int,
    ) -> AdminBookingPage:
        filters = []
        now = datetime.now(UTC)
        if booking_status == BookingStatus.UPCOMING:
            filters.append(Booking.end_time > now)
        elif booking_status == BookingStatus.PAST:
            filters.append(Booking.end_time <= now)

        if search and (term := search.strip()):
            filters.append(
                or_(
                    User.email.icontains(term, autoescape=True),
                    Room.name.icontains(term, autoescape=True),
                )
            )

        joins = (
            (User, Booking.user_id == User.id),
            (Room, Booking.room_id == Room.id),
        )
        total_statement = select(func.count(Booking.id)).select_from(Booking)
        for model, condition in joins:
            total_statement = total_statement.join(model, condition)
        total_statement = total_statement.where(*filters)
        total = int(await self.db.scalar(total_statement) or 0)

        statement = select(
            Booking.id,
            Booking.user_id,
            User.email.label("user_email"),
            Booking.room_id,
            Room.name.label("room_name"),
            Booking.start_time,
            Booking.end_time,
            Booking.created_at,
        ).select_from(Booking)
        for model, condition in joins:
            statement = statement.join(model, condition)
        statement = (
            statement.where(*filters)
            .order_by(Booking.start_time.desc(), Booking.id.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
        )
        rows = (await self.db.execute(statement)).all()
        items = [AdminBookingResponse.model_validate(row._mapping) for row in rows]

        return AdminBookingPage(
            items=items,
            total=total,
            page=page,
            page_size=page_size,
            pages=self._pages(total, page_size),
        )

    async def delete_booking(self, booking_id: int) -> None:
        booking = await self.db.get(Booking, booking_id)
        if booking is None:
            raise self._not_found("Booking")

        await self.db.delete(booking)
        await self.db.commit()

    async def update_room(self, room_id: int, payload: AdminRoomUpdate) -> Room:
        room = await self.db.get(Room, room_id)
        if room is None:
            raise self._not_found("Room")

        changes = payload.model_dump(exclude_unset=True)
        if not changes:
            raise self._bad_request("At least one room field must be provided.")

        non_nullable = {"name", "capacity", "has_projector", "has_whiteboard"}
        if any(changes.get(field) is None for field in non_nullable & changes.keys()):
            raise self._bad_request("Required room fields cannot be null.")

        if "name" in changes:
            duplicate = await self.db.scalar(
                select(Room.id).where(
                    Room.name == changes["name"],
                    Room.id != room.id,
                )
            )
            if duplicate is not None:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="Room with this name already exists.",
                )

        for field, value in changes.items():
            setattr(room, field, value)

        try:
            await self.db.commit()
        except IntegrityError as exc:
            await self.db.rollback()
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Room with this name already exists.",
            ) from exc

        await self.db.refresh(room)
        return room

    async def delete_room(self, room_id: int) -> None:
        room = await self.db.get(Room, room_id)
        if room is None:
            raise self._not_found("Room")

        booking_count = int(
            await self.db.scalar(
                select(func.count(Booking.id)).where(Booking.room_id == room.id)
            )
            or 0
        )
        if booking_count:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Room cannot be deleted while it has bookings.",
            )

        await self.db.delete(room)
        await self.db.commit()
