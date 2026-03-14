FROM python:3.11-slim

WORKDIR /app

# Install dependencies first (better Docker layer caching)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

EXPOSE 8000

# Start the server directly.  Do NOT run "alembic upgrade head" here —
# Railway's DB may already have all tables (created manually / via Supabase),
# and a failed alembic run can hang or block, preventing uvicorn from starting.
# Run migrations manually when needed:  railway run alembic upgrade head
# --no-access-log: suppress per-request INFO lines (each request = 1 log line).
# Under attack these flood Railway's 500 logs/sec limit and drop critical error logs.
# Application-level errors are still logged via the app's own logger.
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--no-access-log"]
