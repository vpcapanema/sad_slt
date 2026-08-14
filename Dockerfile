# SICARD — imagem de produção (FastAPI + GDAL/GeoPandas)
# Base com GDAL já compilado (evita mismatch entre libgdal do SO e o binding Python).
FROM ghcr.io/osgeo/gdal:ubuntu-small-3.8.4

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    DEBIAN_FRONTEND=noninteractive \
    PORT=8080

RUN apt-get update && apt-get install -y --no-install-recommends \
        python3-pip \
        python3-dev \
        build-essential \
        curl \
        ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt ./
RUN --mount=type=cache,target=/root/.cache/pip \
    pip3 install --upgrade pip \
    && GDAL_VERSION="$(gdal-config --version)" \
    && pip3 install "gdal==${GDAL_VERSION}" \
    && pip3 install -r requirements.txt

COPY . ./

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=5 \
    CMD curl -fsS "http://127.0.0.1:${PORT}/api/health" || exit 1

CMD ["sh", "-c", "exec uvicorn api.server:app --host 0.0.0.0 --port ${PORT} --workers 2"]
