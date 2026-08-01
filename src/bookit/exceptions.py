import logging
from fastapi import Request
from fastapi.responses import JSONResponse
from sqlalchemy.exc import SQLAlchemyError

# Настраиваем базовый логгер
logger = logging.getLogger(__name__)

async def global_exception_handler(request: Request, exc: Exception):
    """
    Перехватывает все необработанные ошибки (500 Internal Server Error).
    В консоль пишем реальную ошибку, а юзеру отдаем заглушку.
    """
    logger.error(f"Unhandled exception at {request.url}: {repr(exc)}")
    return JSONResponse(
        status_code=500,
        content={"detail": "Внутренняя ошибка сервера. Пожалуйста, попробуйте позже."},
    )

async def sqlalchemy_exception_handler(request: Request, exc: SQLAlchemyError):
    """
    Перехватывает ошибки базы данных (например, отвал подключения).
    """
    logger.error(f"Database error at {request.url}: {repr(exc)}")
    return JSONResponse(
        status_code=500,
        content={"detail": "Ошибка при работе с базой данных."},
    )
