#!/bin/sh

sleep 1
until nc -z -v -w30 postgres 5432 > /dev/null 2>&1; do
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
echo "--Making migrations livevideo..."
python manage.py makemigrations livevideo
echo "--Making migrations..."
python manage.py makemigrations

echo "--Applying migrations..."
python manage.py migrate

# Collect static files
# echo "--Collecting static files..."
# python manage.py collectstatic --noinput

echo "--Django initialised successfully. Executing "$@""
exec "$@"
