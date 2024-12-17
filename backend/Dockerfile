FROM  python:3.13.1-alpine3.21

WORKDIR /usr/src/app/

ENV   PYTHONDONTWRITEBYTECODE=1
ENV   PYTHONUNBUFFERED=1
ARG   MODE
ENV   MODE=${MODE}

RUN   apk update && \
  # apk add postgresql-client && \
  rm -rf /var/cache/apk/*

RUN   pip install --upgrade pip

COPY  tools/ /tmp/

RUN   pip install -r /tmp/requirements.txt

COPY  . .

ENTRYPOINT [ "/bin/sh", "./tools/entrypoint.sh" ]

# CMD   ["uvicorn", "livevideo.asgi:application", "--host", "0.0.0.0", "--port", "8080", "--reload"]

# CMD   ["gunicorn", "livevideo.asgi:application", "--bind", "0.0.0.0:8080", "-k", "uvicorn.workers.UvicornWorker"]
