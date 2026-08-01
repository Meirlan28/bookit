from fastapi import HTTPException, status

class BookingConflictException(HTTPException):
    def __init__(self):
        super().__init__(
            status_code=status.HTTP_409_CONFLICT,
            detail="Комната уже забронирована на это время."
        )

class BookingNotFoundException(HTTPException):
    def __init__(self):
        super().__init__(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Бронирование не найдено."
        )

class ForbiddenActionException(HTTPException):
    def __init__(self):
        super().__init__(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Вы можете отменять только свои бронирования."
        )
