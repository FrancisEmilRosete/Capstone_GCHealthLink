FROM python:3.11-slim

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Expose port and start FastAPI with uvicorn via gunicorn
EXPOSE 10000
CMD gunicorn main:app --worker-class uvicorn.workers.UvicornWorker --bind 0.0.0.0:${PORT:-10000} --workers 2
