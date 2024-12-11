FROM  python:3.9.20-alpine3.20

WORKDIR /usr/src/app/

ENV   PYTHONDONTWRITEBYTECODE 1
ENV   PYTHONUNBUFFERED 1

RUN   apk update && \
  apk add postgresql-client && \
  rm -rf /var/cache/apk/*

RUN   pip install --upgrade pip

COPY  ./tools/ /tmp/

# Install Python dependencies specified in requirements.txt
RUN   pip install -r /tmp/requirements.txt

RUN   chmod +x /tmp/entrypoint.sh

ENTRYPOINT [ "/bin/sh", "/tmp/entrypoint.sh" ]

CMD ["python", "manage.py", "runserver", "0.0.0.0:8080"]