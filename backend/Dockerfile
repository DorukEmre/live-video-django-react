FROM  python:3.13.1-alpine3.21

WORKDIR /usr/src/app/

ENV   PYTHONDONTWRITEBYTECODE 1
ENV   PYTHONUNBUFFERED 1
ARG   MODE
ENV   MODE=${MODE}

RUN   apk update && \
  apk add postgresql-client && \
  rm -rf /var/cache/apk/*

RUN   pip install --upgrade pip

COPY  ./tools/ /tmp/

RUN   pip install -r /tmp/requirements.txt

RUN   chmod +x /tmp/entrypoint.sh

ENTRYPOINT [ "/bin/sh", "/tmp/entrypoint.sh" ]

# CMD   ["python", "manage.py", "runserver", "0.0.0.0:8080"]

CMD   ["uvicorn", "livevideo.asgi:application", "--host", "0.0.0.0", "--port", "8080", "--reload"]