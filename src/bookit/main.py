from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from sqladmin import Admin
from starlette.middleware.sessions import SessionMiddleware

from src.bookit.auth.admin import AdminAuth, UserAdmin
from src.bookit.auth.config import auth_settings
from src.bookit.auth.router import router as auth_router
from src.bookit.database import engine
from src.bookit.exceptions import register_exception_handlers
from src.bookit.limiter import limiter
from src.bookit.rooms.admin import RoomAdmin
from src.bookit.rooms.bookings.admin import BookingAdmin
from src.bookit.rooms.bookings.router import router as bookings_router
from src.bookit.rooms.router import router as rooms_router


def create_app() -> FastAPI:
    app = FastAPI(
        title="BookIt API",
        description="REST API для бронирования переговорных комнат.",
        version="1.0.0",
        docs_url="/api/docs",
        redoc_url="/api/redoc",
    )

    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
    # app.add_middleware(SlowAPIMiddleware)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=[
            "http://localhost:3000",
            "http://127.0.0.1:3000",
        ],
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allow_headers=["*"],
    )

    app.add_middleware(SessionMiddleware, secret_key=auth_settings.SECRET_KEY)

    register_exception_handlers(app)

    app.include_router(auth_router, prefix="/api/v1")
    app.include_router(rooms_router, prefix="/api/v1")
    app.include_router(bookings_router, prefix="/api/v1")

    authentication_backend = AdminAuth(secret_key=auth_settings.SECRET_KEY)

    admin = Admin(
        app=app,
        engine=engine,
        authentication_backend=authentication_backend,
        title="BookIt Admin Panel",
    )

    admin.add_view(UserAdmin)
    admin.add_view(RoomAdmin)
    admin.add_view(BookingAdmin)

    return app


app = create_app()


@app.get("/health", tags=["System"])
async def health_check():
    return {"status": "ok", "message": "BookIt API is running"}
