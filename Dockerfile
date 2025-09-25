# # Build stage for React
# FROM node:18-alpine as frontend-build
# WORKDIR /app/frontend
# COPY frontend/package*.json ./
# RUN npm ci --only=production
# COPY frontend/ .
# RUN npm run build

# # Python stage for FastAPI
# FROM python:3.11-slim
# WORKDIR /app

# # Install Python dependencies
# COPY backend/requirements.txt .
# RUN pip install --no-cache-dir -r requirements.txt

# # Copy FastAPI backend
# COPY backend/ ./backend/

# # Copy built React app to serve as static files
# COPY --from=frontend-build /app/frontend/build ./frontend/build

# # Expose port
# EXPOSE 8000

# # Start command
# CMD gunicorn backend.main:app --host 0.0.0.0 --port 8000 --worker-class uvicorn.workers.UvicornWorker


# Build stage for Vite React TypeScript
# Build stage for Vite React TypeScript
# ==========================
# Frontend Build Stage
# ==========================
FROM node:18-alpine AS frontend-build
WORKDIR /app/frontend

# Copy package files first for better Docker layer caching
COPY frontend/package*.json ./

# Install dependencies
RUN echo "Installing frontend dependencies..." && npm ci

# Copy Vite config and TypeScript config
COPY frontend/vite.config.ts ./
COPY frontend/tsconfig.json ./
COPY frontend/tsconfig.node.json ./
COPY frontend/tsconfig.app.json ./

# Copy source files
COPY frontend/index.html ./
COPY frontend/public/ ./public/
COPY frontend/src/ ./src/

# Copy environment files
COPY frontend/.env.production ./

# Build the Vite React app with production environment and empty API base URL
RUN echo "Building frontend with Vite..." && NODE_ENV=production VITE_API_BASE_URL="" npm run build && echo "Frontend build complete!"

# ==========================
# Backend Stage
# ==========================
FROM python:3.11-slim
WORKDIR /app

# Install system dependencies
RUN echo "Installing system dependencies..."
RUN apt-get update
RUN apt-get install -y gcc
RUN rm -rf /var/lib/apt/lists/*
RUN echo "System dependencies installed."

# Copy and install Python dependencies
COPY backend/requirements.txt .
RUN echo "Installing Python dependencies..."
RUN pip install --no-cache-dir -r requirements.txt
RUN echo "Python dependencies installed."

# Copy FastAPI backend
COPY backend/ ./backend/
RUN echo "Copied backend source files."

# Copy built Vite app from previous stage (Vite builds to 'dist' by default)
COPY --from=frontend-build /app/frontend/dist ./backend/dist
RUN echo "Copied frontend build into backend."

# Remove frontend folder if exists
RUN echo "Cleaning up frontend folder if exists..."
RUN rm -rf ./frontend
RUN echo "Frontend folder cleaned."

# Expose port (Heroku will override via $PORT env)
EXPOSE 8000

# Run the app
CMD ["sh", "-c", "cd backend; gunicorn -k uvicorn.workers.UvicornWorker main:app"]