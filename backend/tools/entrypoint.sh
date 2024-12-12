#!/bin/sh

sleep 1
until nc -z postgres 5432 > /dev/null 2>&1; do
  sleep 1
done

# # Check if Django project directory exists
# if [ ! -d "livevideo" ]; then
#   echo "--Django project directory not found. Creating project..."
#   django-admin startproject livevideo
#   sleep 2
# else
#   echo "--Django project already exists."
# fi

# cp -f /tmp/manage.py .

# Migrate the database
echo "--Making migrations..."
python manage.py makemigrations

echo "--Applying migrations..."
python manage.py migrate

# Collect static files
if [ "$MODE" = "production" ]; then
  echo "--Waiting for React to build..."
  until nc -z react 5173 > /dev/null 2>&1; do
    sleep 1
  done
  echo "--Collecting static files..."
  python manage.py collectstatic --noinput
else
  echo "--Skipping collectstatic for development mode."
fi

echo "--Django initialised successfully. Executing "$@""
exec "$@"
