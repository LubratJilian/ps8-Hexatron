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

const activeGames = new Map(); // { gameId => { game-component: GameEngine, players: Set<socketId> } }
const socketGameId = new Map(); // socketId -> gameId

function handleEvent(gatewaySocket, gameId, eventName, eventData) {
    if (!activeGames.has(gameId))
        return;

    gatewaySocket.emit(eventName, {
        eventData,
        room: Array.from(activeGames.get(gameId).room)
    });

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

function sendError(socket, errorType, message, room = null) {
    socket.emit("error", {
        eventData: {
            type: errorType,
            message: message,
        },
        room
    });
}

io.on('connection', (gatewaySocket) => {
    console.log('✅ Gateway connected to the Game Service');

    gatewaySocket.on('disconnect', () => {
        console.log('❌ Gateway disconnected');
    });

    gatewaySocket.on('leaveGame', (socketId) => {
        const gameId = socketGameId.get(socketId);
        const game = activeGames.get(gameId)?.game;

        if (!game)
            return;

        const leavingPlayers = Object.values(game.game.players)
            .filter(player => player.socketId === socketId);

        const gameEnd = leavingPlayers.reduce(
            (gameEnd, player) => gameEnd || game.disconnectPlayer(player.id), false
        );

        if (gameEnd)
            activeGames.delete(gameId);
    });

    gatewaySocket.on("start", (data) => {
        try {
            validateGameInput(data.args[0]);
            const {gameType, rowNumber, columnNumber, roundsCount, playersCount, users} = data.args[0];
            const players = users.map(user => new Player(user.id, user.name, data.socketId));

            const newGame = new GameEngine(
                players,
                gameType,
                rowNumber,
                columnNumber,
                roundsCount,
                playersCount,
                (gameId, eventName, eventData) => handleEvent(gatewaySocket, gameId, eventName, eventData)
            );

            activeGames.set(newGame.id, {
                game: newGame,
                room: new Set([data.socketId])
            });

            socketGameId.set(data.socketId, newGame.id);
            newGame.start().then();

            gatewaySocket.emit("refreshStatus", {
                eventData: {
                    status: CREATED,
                    data: {id: newGame.id, players: newGame.game.players}
                },
                room: [data.socketId]
            });

        } catch ({type, message}) {
            console.log(type, message);
            sendError(
                gatewaySocket,
                type || ErrorTypes.GAME_CREATION_FAILED,
                message,
                [data.socketId]
            );
        }
    });

    gatewaySocket.on("nextMove", (data) => {
        const {gameId, playerId, move} = data.args[0];

        if (!gameId || !playerId || move === undefined) {
            sendError(gatewaySocket, ErrorTypes.INVALID_INPUT, "Missing required move parameters");
            return;
        }

        const gameData = activeGames.get(gameId);
        if (!gameData) {
            sendError(gatewaySocket, ErrorTypes.GAME_NOT_FOUND, "Game not found");
            return;
        }

        const player = gameData.game.game.players[playerId];
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
