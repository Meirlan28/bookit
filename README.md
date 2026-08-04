# BookIt

BookIt — веб-приложение для бронирования офисных переговорных. В проекте есть каталог комнат, личное расписание, защищённая авторизация с refresh-сессиями и подтверждением нового устройства, управление активными сессиями и полноценный центр управления для администратора.

## Стек

- Backend: FastAPI, SQLAlchemy, PostgreSQL, Alembic
- Frontend: React, TypeScript, Vite, TanStack Query, React Hook Form, Zod
- UI: адаптивная дизайн-система, Lucide Icons, Sonner, Manrope Variable

## Локальный запуск

Требуются Python 3.12+, `uv`, Node.js 20+ и Docker.

1. Подготовьте окружение backend:

   ```bash
   cp .env.example .env
   docker compose up -d db
   uv sync --locked
   uv run alembic upgrade head
   ```

2. Запустите API:

   ```bash
   uv run uvicorn bookit.main:app --host 127.0.0.1 --port 8000 --reload
   ```

3. В другом терминале запустите frontend:

   ```bash
   cd frontend
   npm install
   npm run dev
   ```

Frontend откроется на [http://localhost:3000](http://localhost:3000), Swagger — на [http://localhost:8000/api/docs](http://localhost:8000/api/docs). Vite проксирует `/api` и `/health` на backend, поэтому HttpOnly refresh-cookie работает в same-origin режиме.

## Админ-панель

React-админка доступна авторизованным пользователям с ролью `admin` по [http://localhost:3000/admin](http://localhost:3000/admin). В ней есть:

- сводка по пользователям, комнатам и бронированиям;
- создание, редактирование и безопасное удаление комнат;
- глобальный список бронирований с поиском, фильтрами, пагинацией и удалением;
- поиск пользователей, назначение ролей и управление активностью аккаунтов.

Все административные операции дополнительно защищены ролью на backend в `/api/v1/admin`. Собственную admin-роль и активность нельзя снять из текущей сессии. Комнату с существующими бронированиями удалить нельзя, пока записи не будут удалены — это сохраняет историю и защищает от случайной потери данных.

Техническая SQLAdmin-панель сохранена по [http://localhost:8000/internal/admin](http://localhost:8000/internal/admin). Она также требует активный, подтверждённый аккаунт с ролью `admin`.

## Проверки frontend

```bash
cd frontend
npm run typecheck
npm run lint
npm test
npm run build
```

## Конфигурация

Backend читает переменные из корневого `.env`; безопасный шаблон находится в `.env.example`. Frontend по умолчанию обращается к относительному `/api`. Для отдельного API origin можно задать `VITE_API_URL` в `frontend/.env`, но в production предпочтительнее проксировать frontend и API через один origin из-за `SameSite=Strict` refresh-cookie.

## Текущие ограничения API

- API не отдаёт расписание чужих бронирований и свободные слоты комнаты. Интерфейс подтверждает доступность только при создании брони и показывает конфликт, если интервал занят.
- Пользовательский REST API пока не поддерживает перенос бронирования и завершение одной выбранной сессии; редактирование и удаление комнат доступны через защищённый admin API.
- Проверка пересечений броней выполняется приложением и пока не защищена ограничением на уровне PostgreSQL от двух строго одновременных запросов.
- `/health` проверяет процесс API, но не подключение к базе данных.
