FROM python:3.12-slim

ENV PYTHONUNBUFFERED=1
WORKDIR /app

# Archivos estáticos
COPY index.html style.css ./
COPY js ./js
COPY assets ./assets

# Puerto (HF lo inyecta, en local usaremos 7860)
ENV PORT=7860

# Servidor HTTP simple
CMD ["bash", "-lc", "python -m http.server $PORT -d . -b 0.0.0.0"]
