FROM python:3.12-slim

WORKDIR /app

# System dependencies
RUN apt-get update -o Acquire::ForceIPv4=true && apt-get install -y \
    libpq-dev \
    gcc \
    g++ \
    libgl1-mesa-glx \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy source
COPY . .

# Create media directories
RUN mkdir -p /app/media/uploads /app/media/masks /app/media/overlays /app/media/reports

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
