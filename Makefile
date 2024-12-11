SHELL	= /bin/sh

NAME	= livevideo


all:
	docker compose build --progress=plain
	docker compose up
# docker compose up --build

create_volumes_dirs: # creates volume directories if needed
	mkdir -p ./volumes/frontend ./volumes/backend ./volumes/certs ./volumes/logs

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

