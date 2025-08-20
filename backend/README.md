# Performance Management System - Backend

This is the backend service for the Performance Management System, built with FastAPI and PostgreSQL.

## Prerequisites

- Python 3.9+
- PostgreSQL 13+
- pip (Python package manager)

## Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd Performance_Management_System/backend
   ```

2. **Create and activate a virtual environment**
   ```bash
   # Windows
   python -m venv venv
   .\venv\Scripts\activate
   
   # macOS/Linux
   python3 -m venv venv
   source venv/bin/activate
   ```

3. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4. **Set up environment variables**
   - Copy `.env.example` to `.env`
   - Update the database connection string and other settings in `.env`
   ```bash
   cp .env.example .env
   ```

5. **Set up the database**
   - Create a new PostgreSQL database
   - Update the `DATABASE_URL` in `.env` with your database credentials
   - Example: `postgresql+asyncpg://username:password@localhost:5432/performance_db`

6. **Run database migrations**
   ```bash
   # Initialize migrations (first time only)
   alembic init migrations
   
   # Generate a new migration
   alembic revision --autogenerate -m "Initial migration"
   
   # Apply migrations
   alembic upgrade head
   ```

## Running the Application

```bash
# Start the development server
python run.py
```

The API will be available at `http://localhost:8000`

## API Documentation

- **Swagger UI**: `http://localhost:8000/docs`
- **ReDoc**: `http://localhost:8000/redoc`

## Project Structure

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py              # FastAPI application
│   ├── config.py            # Application configuration
│   ├── db/
│   │   ├── __init__.py
│   │   └── database.py      # Database connection and session management
│   ├── models/              # SQLAlchemy models
│   ├── schemas/             # Pydantic models
│   └── routers/             # API route handlers
├── migrations/              # Database migrations
├── tests/                   # Test files
├── .env.example             # Example environment variables
├── .gitignore
├── alembic.ini              # Alembic configuration
├── requirements.txt         # Project dependencies
└── run.py                  # Application entry point
```

## Development

### Running Tests

```bash
pytest
```

### Code Formatting

This project uses `black` for code formatting:

```bash
black .
```

### Linting

This project uses `flake8` for linting:

```bash
flake8
```

## Deployment

For production deployment, consider using:

1. Gunicorn with Uvicorn workers
2. Nginx as a reverse proxy
3. Systemd or Supervisor for process management

Example Gunicorn command:
```bash
gunicorn -w 4 -k uvicorn.workers.UvicornWorker app.main:app
```

## License

[MIT](LICENSE)
