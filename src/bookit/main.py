from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from sqladmin import Admin
from sqlalchemy.exc import SQLAlchemyError  # <-- Добавили импорт

from bookit import limiter
from src.bookit.auth.admin import AdminAuth, UserAdmin
from src.bookit.auth.router import router as auth_router
from src.bookit.config import settings
from src.bookit.database import engine
from src.bookit.exceptions import global_exception_handler, sqlalchemy_exception_handler
from src.bookit.limiter import limiter  # <-- Наш лимитер
from src.bookit.rooms.admin import RoomAdmin
from src.bookit.rooms.bookings.admin import BookingAdmin
from src.bookit.rooms.bookings.router import router as bookings_router
from src.bookit.rooms.router import router as rooms_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    print("Application is starting up...")
    yield
    print("Application is shutting down...")


def create_app() -> FastAPI:
    app = FastAPI(
        title="BookIt API",
        description="REST API для бронирования переговорных комнат.",
        version="1.0.0",
        lifespan=lifespan,
        docs_url="/api/docs",
        redoc_url="/api/redoc",
    )

    # ---> ПОДКЛЮЧАЕМ RATE LIMITER <---
    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
    app.add_middleware(SlowAPIMiddleware)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=[
            "http://localhost:3000",
            "http://127.0.0.1:3000",
        ],  # URL фронтенда
        allow_credentials=True,  # Разрешаем куки (HttpOnly refresh token)
        allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allow_headers=["*"],
    )

    # ---> РЕГИСТРАЦИЯ ОБРАБОТЧИКОВ ИСКЛЮЧЕНИЙ <---
    app.add_exception_handler(Exception, global_exception_handler)
    app.add_exception_handler(SQLAlchemyError, sqlalchemy_exception_handler)

    # Подключаем роутеры с версионированием (API Versioning)
    app.include_router(auth_router, prefix="/api/v1")
    app.include_router(rooms_router, prefix="/api/v1")
    app.include_router(bookings_router, prefix="/api/v1")

    # Инициализация sqladmin
    authentication_backend = AdminAuth(secret_key=settings.SECRET_KEY)

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


async def health_check():
    return {"status": "ok", "message": "BookIt API is running"}
