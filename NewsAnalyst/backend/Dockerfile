FROM python:3.11-slim

WORKDIR /app

# Install dependencies first (better Docker layer caching)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

EXPOSE 8000

# Run database migrations then start the server.
# Using ";" (not "&&") so uvicorn always starts even if alembic fails
# (e.g. when alembic_version table doesn't exist in the DB yet).
# ${PORT:-8000} lets Railway inject its own port via the PORT env var.
CMD ["sh", "-c", "alembic upgrade head; exec uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
