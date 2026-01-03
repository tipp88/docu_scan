FROM python:3.11-slim

WORKDIR /app

# Install system dependencies for SMB and other protocols
RUN apt-get update && apt-get install -y \
    libsmbclient-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY ./app ./app

# Create logs directory
RUN mkdir -p /app/logs

EXPOSE 8888

# Run the application
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8888"]
