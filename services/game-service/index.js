const http = require('http');
const {Server} = require('socket.io');
const GameEngine = require("./game/GameEngine.js");
const {GAME_END, CREATED} = require("./game/GameStatus");
const RemotePlayer = require("./game/RemotePlayer");
const {GameType} = require("./game/Game");

const ErrorTypes = Object.freeze({
    GAME_NOT_FOUND: 'GAME_NOT_FOUND',
    PLAYER_NOT_FOUND: 'PLAYER_NOT_FOUND',
    INVALID_INPUT: 'INVALID_INPUT',
    GAME_CREATION_FAILED: 'GAME_CREATION_FAILED',
    ALREADY_IN_GAME: 'ALREADY_IN_GAME'
});

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
const pendingGames = [];

function handleEvent(gameId, eventName, eventData) {
    if (!activeGames.has(gameId))
        return;

    io.to(gameId).emit(eventName, eventData);

    if (eventName === "refreshStatus" && eventData.status === GAME_END)
        activeGames.delete(gameId);
}

function sendError(socket, errorType, message) {
    socket.emit("error", {
        type: errorType,
        message: message,
    });
}

function startGameIfReady(game, gameIndex, isNewGame) {
    if (game.game.players.size === game.playersCount || game.game.type === GameType.AI) {
        if (gameIndex !== -1)
            pendingGames.splice(gameIndex, 1);

        game.start().then();
        activeGames.set(game.id, game);
        io.to(game.id).emit("refreshStatus", {
            status: CREATED,
            data: {id: game.id, players: Object.fromEntries(game.game.players)}
        });
    } else if (isNewGame)
        pendingGames.push(game);
}

function validateJoin(users, gameType, socket) {
    if (!Array.isArray(users) || users.length === 0 || !gameType == null) {
        throw {
            type: ErrorTypes.INVALID_INPUT,
            message: "Invalid data"
        };
    }

    const socketRooms = Array.from(socket.rooms);
    const isAlreadyInGame = socketRooms.some(room => room !== socket.id);

    if (isAlreadyInGame) {
        throw {
            type: ErrorTypes.ALREADY_IN_GAME,
            message: "This user is already in a game."
        };
    }
}

io.on('connection', (gatewaySocket) => {
    console.log('✅ Gateway socket connected to the Game Service');

    gatewaySocket.on("disconnecting", () => {
        gatewaySocket.rooms.forEach((room) => {
            const playerIds = socketToUser.get(gatewaySocket.id);
            const game = activeGames.get(room);

            if (!game || !playerIds)
                return;

            const leavingPlayers = Array.from(game.game.players.values())
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

    gatewaySocket.on("joinGame", (gameParams) => {
        try {
            const {users, gameType} = gameParams;
            validateJoin(users, gameType, gatewaySocket);

            const players = [];
            const playerIds = [];

            users.forEach(user => {
                players.push(new RemotePlayer(user.id, user.name));
                playerIds.push(user.id);
            });

            socketToUser.set(gatewaySocket.id, playerIds);
            const gameIndex = pendingGames.findIndex(gameEngine =>
                gameEngine.game.type === gameType &&
                gameEngine.game.players.size + users.length <= gameEngine.playersCount
            );

            let game;
            let isNewGame = false;
            if (gameIndex !== -1) {
                game = pendingGames[gameIndex];
                players.forEach(player => game.addPlayer(player));
            } else {
                game = new GameEngine(
                    players,
                    gameType,
                    9,
                    16,
                    3,
                    2,
                    (gameId, eventName, eventData) => handleEvent(gameId, eventName, eventData)
                );
                isNewGame = true;
            }

            gatewaySocket.join(game.id);
            startGameIfReady(game, gameIndex, isNewGame);
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

        const player = gameEngine.game.players.get(playerId);
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
