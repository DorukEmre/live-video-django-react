# Template Repository for React, Django and PostgreSQL in Docker containers

This repository is a template for setting up a full-stack application using React for the frontend, Django for the backend, and PostgreSQL for the database, all within Docker containers.

## Getting Started

To get started with this template, follow the steps below:

1. **Clone the repository:**

2. **Build and start the Docker containers:**
  ```sh
  make
  ```
  or
  ```sh
  docker-compose up --build
  ```

3. **Access the application:**
  - In development mode, open your browser and go to [http://localhost:5173](http://localhost:5173)
  - In production mode, open your browser and go to [http://localhost:8080](http://localhost:8080)

## Configuration

The application can be run in either development or production mode. To switch between these modes, follow the instructions below:

- Change `MODE` and `target` in the `docker-compose.yml` file:
  ```yaml
  services:
   django:
    build:
      args:
       MODE: production or development
   react:
    build:
      target: production or development
  ```

- Enable or disable volumes:
  - For development:
    ```yaml
    django:
      volumes:
        - ./backend:/usr/src/app
        # - ./frontend/dist:/usr/src/app/frontendDist # for production
    react:
      volumes:
        - /app/node_modules # to avoid overwriting node_modules
        - ./frontend:/app # for development (for live changes to be reflected)
        # - ./frontend/dist:/app/dist # for production (build directory)
    ```
  - For production:
    ```yaml
    django:
      volumes:
        - ./backend:/usr/src/app
        - ./frontend/dist:/usr/src/app/frontendDist # for production
    react:
      volumes:
        - /app/node_modules # to avoid overwriting node_modules
        # - ./frontend:/app # for development (for live changes to be reflected)
        - ./frontend/dist:/app/dist # for production (build directory)
    ```

- Configure port access from the host machine:
  - For development:
    ```yaml
    react:
      ports:
        - 5173:5173
    ```
  - For production:
    ```yaml
    react:
      expose:
        - 5173
    ```
