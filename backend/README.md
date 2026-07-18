# Will Stride Events Backend

Production-ready Django REST backend for the Project Tracking and Employee Daily Reporting app.

## Stack

- Python, Django, Django REST Framework
- PostgreSQL with Neon through `DATABASE_URL`
- JWT auth with `djangorestframework-simplejwt`
- CORS with `django-cors-headers`
- File uploads with Pillow-backed image support
- CSV and Excel export with `openpyxl`
- Swagger/OpenAPI with `drf-spectacular`

## Setup

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\python -m pip install --upgrade pip
.\.venv\Scripts\python -m pip install -r requirements.txt
Copy-Item .env.example .env
```

Update `.env` with real values. This repository already includes a local `.env` for the database URL provided during setup, and `.gitignore` keeps it out of version control.

## Environment Variables

| Variable | Purpose |
| --- | --- |
| `SECRET_KEY` | Django signing secret |
| `DEBUG` | `True` for local development, `False` for production |
| `ALLOWED_HOSTS` | Comma-separated hostnames |
| `DATABASE_URL` | PostgreSQL connection string |
| `USE_SQLITE` | Set to `True` only for local fallback or fast tests |
| `CORS_ALLOWED_ORIGINS` | Comma-separated frontend origins |
| `ACCESS_TOKEN_LIFETIME_MINUTES` | JWT access token lifetime |
| `REFRESH_TOKEN_LIFETIME_DAYS` | JWT refresh token lifetime |
| `MEDIA_ROOT` | Upload storage directory |
| `MAX_ATTACHMENT_SIZE_MB` | Attachment upload cap |

## Database

```powershell
cd backend
.\.venv\Scripts\python manage.py makemigrations
.\.venv\Scripts\python manage.py migrate
```

The app uses PostgreSQL when `DATABASE_URL` is set and `USE_SQLITE` is not true. SQLite is available only as a local fallback:

```powershell
$env:USE_SQLITE='True'
.\.venv\Scripts\python manage.py migrate
```

## Admin User

```powershell
.\.venv\Scripts\python manage.py createsuperuser
```

The superuser command prompts for `username`, `email`, `full_name`, and password. Admins can then create employee accounts with only a username and password from the app.

## Run

```powershell
cd backend
.\.venv\Scripts\python manage.py runserver 0.0.0.0:8001
```

Frontend environment variable:

```env
VITE_API_BASE_URL=http://127.0.0.1:8001/api
```

## Tests

Tests default cleanly against SQLite to avoid modifying shared PostgreSQL data:

```powershell
cd backend
$env:USE_SQLITE='True'
.\.venv\Scripts\python manage.py test
```

## API Documentation

- Swagger: `http://127.0.0.1:8001/api/docs/`
- ReDoc: `http://127.0.0.1:8001/api/redoc/`
- Schema: `http://127.0.0.1:8001/api/schema/`

## API Groups

- Auth: `/api/auth/login/` with `username` and `password`, `/api/auth/token/refresh/`, `/api/auth/me/`, `/api/auth/change-password/`, `/api/auth/logout/`
- Employees: `/api/employees/`
- Projects: `/api/projects/`
- Tasks: `/api/tasks/`
- Reports: `/api/reports/`, `/api/reports/{id}/comments/`, `/api/report-comments/{id}/`
- Notifications: `/api/notifications/`
- Dashboards: `/api/dashboard/admin/`, `/api/dashboard/employee/`
- Audit logs: `/api/audit-logs/`

## Deployment Notes

Set `DEBUG=False`, rotate `SECRET_KEY`, keep `DATABASE_URL` and CORS origins in the host environment, and serve `/media/` through durable object storage or a configured media volume. Do not use wildcard CORS origins in production.
