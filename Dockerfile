# Multi-platform production container for PotionPulse FastAPI
FROM python:3.11-slim

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PORT=8000

WORKDIR /app

# Install system dependencies for LightGBM & C compilers
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libgomp1 \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy dependency manifest & install
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend source code and seed files
COPY backend/ ./backend/
COPY forecast.py ./forecast.py
COPY restock.py ./restock.py
COPY anomalies.py ./anomalies.py
COPY sample_sales.csv ./sample_sales.csv

EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:${PORT}/health || exit 1

# Production entrypoint
CMD ["sh", "-c", "uvicorn backend.main:app --host 0.0.0.0 --port ${PORT} --workers 2"]

