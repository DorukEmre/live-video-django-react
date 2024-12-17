SHELL	= /bin/sh

NAME	= livevideo

all: dev

dev: create_volumes_dirs
	docker compose up --build react django
# docker compose build --progress=plain
# docker compose up

build_and_deploy: create_volumes_dirs
	rm -rf ./frontend/dist
	rm -rf ./backend/frontendDist/*
	rm -rf ./backend/staticfiles/*
	docker compose up --build react_prod && \
	cp -r ./frontend/dist/* ./backend/frontendDist/ && \
	cd ./backend && \
	heroku container:push web -a live-video && \
	heroku container:release web -a live-video


create_volumes_dirs: # creates volume directories if needed
	mkdir -p ./frontend/dist ./backend/frontendDist


down:
	docker compose down -v
stop:
	docker compose stop

prune:
	docker image prune
routine:
	docker system prune -a
reset:
	docker stop $$(docker ps -qa); \
	docker rm $$(docker ps -qa); \
	docker rmi -f $$(docker images -qa); \
	docker volume rm $$(docker volume ls -q); \
	docker network rm $$(docker network ls -q) 2>/dev/null


postgres:
	docker exec -it postgres sh \
		-c "psql -U postgres_main_user -d pg_db"

django:
	docker exec -it django sh 
react:
	docker exec -it react sh 

django_restart:
	docker restart django


.phony: all down stop prune routine reset \
	django react django_restart postgres

