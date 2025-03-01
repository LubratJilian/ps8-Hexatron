const http = require('http');
const {Server} = require('socket.io');
const GameEngine = require("./game/GameEngine.js");
const {Player} = require("./game/Player");
const {GAME_END, CREATED} = require("./game/GameStatus");

const ErrorTypes = {
    GAME_NOT_FOUND: 'GAME_NOT_FOUND',
    PLAYER_NOT_FOUND: 'PLAYER_NOT_FOUND',
    INVALID_INPUT: 'INVALID_INPUT',
    GAME_CREATION_FAILED: 'GAME_CREATION_FAILED',
};

const server = http.createServer(function (request, response) {
    if (request.url.split("/")[1] === "health") {
        response.writeHead(204);
        response.end();
    }
});

const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

const activeGames = new Map(); // { gameEngineId => gameEngine }
const socketToUser = new Map(); // socketId -> userId

function handleEvent(gatewaySocket, gameId, eventName, eventData) {
    if (!activeGames.has(gameId))
        return;

    gatewaySocket.emit(eventName, eventData);

    if (eventName === "refreshStatus" && eventData.status === GAME_END)
        activeGames.delete(gameId);
}

function validateGameInput(data) {
    const {gameType, rowNumber, columnNumber, roundsCount, playersCount, users} = data;

    if (gameType == null || !rowNumber || !columnNumber || !roundsCount || !playersCount || !users) {
        throw {
            type: ErrorTypes.INVALID_INPUT,
            message: "Missing required game parameters"
        };
    }

    if (rowNumber <= 0 || columnNumber <= 0 || roundsCount <= 0 || playersCount <= 0) {
        throw {
            type: ErrorTypes.INVALID_INPUT,
            message: "Invalid game dimensions or parameters"
        };
    }

    if (!Array.isArray(users) || users.length === 0) {
        throw {
            type: ErrorTypes.INVALID_INPUT,
            message: "Invalid users data"
        };
    }
}

function sendError(socket, errorType, message) {
    socket.emit("error", {
        type: errorType,
        message: message,
    });
}

io.on('connection', (gatewaySocket) => {
    console.log('✅ Gateway socket connected to the Game Service');

    gatewaySocket.on("disconnecting", () => {
        gatewaySocket.rooms.forEach((room) => {
            const playerIds = socketToUser.get(gatewaySocket.id);
            const game = activeGames.get(room);

            if (!game || !playerIds)
                return;

            const leavingPlayers = Object.values(game.game.players)
                .filter(gamePlayer => playerIds.includes(gamePlayer.id));

            const gameEnd = leavingPlayers.reduce(
                (gameEnd, player) => gameEnd || game.disconnectPlayer(player.id), false
            );

            if (gameEnd)
                activeGames.delete(game.id);

            socketToUser.delete(gatewaySocket.id);
            gatewaySocket.broadcast.to(room).emit("userLeft", `${gatewaySocket.id} leaved the room`);
        });
    });

    gatewaySocket.on('disconnect', () => {
        console.log('❌ Gateway socket disconnected');
    });

    gatewaySocket.on("start", (data) => {
        try {
            validateGameInput(data);
            const {gameType, rowNumber, columnNumber, roundsCount, playersCount, users} = data;
            const players = [];
            const playerIds = [];

            users.forEach(user => {
                players.push(new Player(user.id, user.name));
                playerIds.push(user.id);
            });

            socketToUser.set(gatewaySocket.id, playerIds);

            const newGame = new GameEngine(
                players,
                gameType,
                rowNumber,
                columnNumber,
                roundsCount,
                playersCount,
                (gameId, eventName, eventData) => handleEvent(gatewaySocket, gameId, eventName, eventData)
            );

            activeGames.set(newGame.id, newGame);
            gatewaySocket.join(newGame.id);

            newGame.start().then();

            gatewaySocket.emit("refreshStatus", {
                status: CREATED,
                data: {id: newGame.id, players: newGame.game.players}
            });

        } catch ({type, message}) {
            sendError(
                gatewaySocket,
                type || ErrorTypes.GAME_CREATION_FAILED,
                message
            );
        }
    });

    gatewaySocket.on("nextMove", (data) => {
        const {gameId, playerId, move} = data;

        if (!gameId || !playerId || move === undefined) {
            sendError(gatewaySocket, ErrorTypes.INVALID_INPUT, "Missing required move parameters");
            return;
        }

        if (!activeGames.has(gameId)) {
            sendError(gatewaySocket, ErrorTypes.GAME_NOT_FOUND, "Game not found");
            return;
        }

        const gameEngine = activeGames.get(gameId);

        const player = gameEngine.game.players[playerId];
        if (!player) {
            sendError(gatewaySocket, ErrorTypes.PLAYER_NOT_FOUND, "Player not found");
            return;
        }

        player.resolveMove(move);
    });
});

server.listen(8002, () => {
    console.log(`🎮 Game Service WebSocket listening on ${process.env.GAME_SERVICE_URL}`);
});
