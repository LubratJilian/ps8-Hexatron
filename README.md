# PS8 - HEXATRON

## Team

- Antoine-Marie Michelozzi
- Jilian Lubrat

## Run

To run the project, you need to have Docker and Docker Compose installed.

There are two possible run modes:

- Development Mode
- Production Mode

### 1. Development mode

The development mode allows you to edit the front without to have to rebuild the ```files-service``` to see the result, just refresh the page.
The ```front``` directory of the ```files-service``` is not copied in the container but mounted as a volume.

This setup is achieved by merging two Docker Compose files: the main ```docker-compose.yml``` file and the ```docker-compose.dev.yml``` file.

To launch in development mode, run the following command:

 ``` 
 docker-compose -f docker-compose.yml -f docker-compose.dev.yml --env-file Variables.env up -d --build 
 ```

### 2. Production mode

The production is the default mode. The ```front``` directory of the ```files-service``` is copied in the container.

To launch in production mode, run the following command:

 ``` 
 docker-compose --env-file Variables.env up -d --build 
 ```

---