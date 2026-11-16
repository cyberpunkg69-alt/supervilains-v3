FROM python:3.11-slim
RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg tesseract-ocr tesseract-ocr-fra tesseract-ocr-eng && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY detector.py server.py cinema.py smart_editor.py audio_v07.py cinema.html ./
ENV PORT=10000 PYTHONUNBUFFERED=1 COOPX_SAMPLE_SECONDS=6 OMP_THREAD_LIMIT=1 OPENBLAS_NUM_THREADS=1
CMD ["sh", "-c", "uvicorn server:app --host 0.0.0.0 --port ${PORT}"]
