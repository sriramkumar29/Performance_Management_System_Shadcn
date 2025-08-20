# Environment Configuration Setup

This document explains how to configure the environment variables for both frontend and backend components.

## Frontend Configuration

### Step 1: Copy Environment Template Files

Copy the template files to their proper names:

```bash
# For development
cp env.development.template .env.development.local

# For production  
cp env.production.template .env.production.local

# General template
cp env.example .env.local
```

### Step 2: Update Environment Variables

Edit the copied files with your actual values:

**Development (.env.development.local):**
- `VITE_API_BASE_URL=http://localhost:6000`
- `VITE_FRONTEND_BASE_URL=http://localhost:5173`

**Production (.env.production.local):**
- `VITE_API_BASE_URL=https://your-api-domain.com`
- `VITE_FRONTEND_BASE_URL=https://your-frontend-domain.com`

## Backend Configuration

### Step 1: Copy Configuration Files

```bash
# Copy environment template
cp env.template .env

# Copy config template
cp config.template.py config.py
```

### Step 2: Update Configuration

Edit the copied files:

**Backend (.env):**
- Update `DATABASE_URL` with your database credentials
- Set `API_PORT=6000` (or your preferred port)
- Update `SECRET_KEY` for production

**Backend (config.py):**
- Add your production frontend URLs to `CORS_ORIGINS`
- Update other settings as needed

## Running the Application

### Development Mode

**Backend:**
```bash
cd backend
uvicorn main:app --reload --host 0.0.0.0 --port 6000
```

**Frontend:**
```bash
cd frontend
npm run dev
```

### Production Mode

**Backend:**
```bash
cd backend
uvicorn main:app --host 0.0.0.0 --port 6000
```

**Frontend:**
```bash
cd frontend
npm run build
npm run preview
```

## Environment Variables Reference

### Frontend Variables

| Variable | Description | Development | Production |
|----------|-------------|-------------|------------|
| `VITE_API_BASE_URL` | Backend API URL | `http://localhost:6000` | `https://api.yourdomain.com` |
| `VITE_FRONTEND_BASE_URL` | Frontend URL | `http://localhost:5173` | `https://yourdomain.com` |
| `VITE_BACKEND_BASE_URL` | Backend URL | `http://localhost:6000` | `https://api.yourdomain.com` |
| `VITE_MODE` | Environment mode | `development` | `production` |
| `VITE_DEV_MODE` | Development features | `true` | `false` |

### Backend Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection | `postgresql+asyncpg://user:pass@localhost/db` |
| `API_HOST` | API host | `0.0.0.0` |
| `API_PORT` | API port | `6000` |
| `ENVIRONMENT` | Environment mode | `development` or `production` |
| `DEBUG` | Debug mode | `true` or `false` |
| `SECRET_KEY` | Security key | `your-secret-key` |

## Troubleshooting

### CORS Issues
- Ensure frontend URL is in backend's `CORS_ORIGINS`
- Check that ports match between frontend and backend configuration

### API Connection Issues
- Verify `VITE_API_BASE_URL` points to correct backend URL
- Check that backend is running on the configured port
- Ensure proxy configuration in `vite.config.ts` matches backend port

### Environment Variables Not Loading
- Ensure `.env` files are in the correct directories
- Restart development servers after changing environment variables
- Check that variable names start with `VITE_` for frontend variables
