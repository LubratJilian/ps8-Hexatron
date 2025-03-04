const http = require('http');
const {Server} = require('socket.io');
const GameEngine = require("./game/GameEngine.js");
const {GAME_END, CREATED} = require("./game/GameStatus");
const RemotePlayer = require("./game/RemotePlayer");
const {GameType} = require("./game/Game");
const {GAME_SETTINGS} = require("./game/Utils");

const ErrorTypes = Object.freeze({
    GAME_NOT_FOUND: 'GAME_NOT_FOUND',
    PLAYER_NOT_FOUND: 'PLAYER_NOT_FOUND',
    INVALID_INPUT: 'INVALID_INPUT',
    GAME_CREATION_FAILED: 'GAME_CREATION_FAILED',
    ALREADY_IN_GAME: 'ALREADY_IN_GAME'
    ALREADY_IN_GAME: 'ALREADY_IN_GAME',
    GAME_ERROR: 'GAME_ERROR'
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
const friendlyGames = new Map(); // playerId -> gameEngine
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
    const isReady = game.game.players.size === game.playersCount || game.game.type === GameType.AI;

    if (isReady) {
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

    return isReady;
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

function createNewGame(players, gameType) {
    return new GameEngine(
        players,
        gameType,
        GAME_SETTINGS.ROW_NUMBER,
        GAME_SETTINGS.COL_NUMBER,
        GAME_SETTINGS.ROUNDS_COUNT,
        GAME_SETTINGS.PLAYERS_COUNT,
        (gameId, eventName, eventData) => handleEvent(gameId, eventName, eventData)
    );
}

        gameEngine.start().then().catch(({type, _}) => {
            io.to(gameEngine.id).emit("error", {
                type: type || ErrorTypes.GAME_ERROR,
                message: "An error has been encountered during the game.",
            });
        });
function joinFriendlyGame(player, expectedPlayerId, socket) {
    let game;

    // If the player already has a pending friendly game, add them to it
    if (friendlyGames.has(player.id)) {
        game = friendlyGames.get(player.id);
        game.addPlayer(player.id);
        socket.join(game.id);
    }
    // Otherwise, if an expected player ID is provided, create a new game
    else if (expectedPlayerId) {
        game = createNewGame([player], GameType.FRIENDLY);
        socket.join(game.id);
        friendlyGames.set(expectedPlayerId, game);
    }

    if (startGameIfReady(game, -1, false))
        friendlyGames.delete(expectedPlayerId);
}

io.on('connection', (gatewaySocket) => {
    console.log('✅ Gateway socket connected to the Game Service');

    gatewaySocket.on("joinGame", (gameParams) => {
        try {
            const {players, gameType, expectedPlayerId = null} = gameParams;
            validateJoin(players, gameType, gatewaySocket);

            const remotePlayers = [];
            const playerIds = [];

            players.forEach(player => {
                remotePlayers.push(new RemotePlayer(player.id, player.name));
                playerIds.push(player.id);
            });

            socketToUser.set(gatewaySocket.id, playerIds);

            if (gameType === GameType.FRIENDLY) {
                joinFriendlyGame(remotePlayers[0], expectedPlayerId, gatewaySocket);
                return;
            }

            const gameIndex = pendingGames.findIndex(gameEngine =>
                gameEngine.game.type === gameType &&
                gameEngine.game.players.size + remotePlayers.length <= gameEngine.playersCount
            );

            let game;
            let isNewGame = false;
            if (gameIndex !== -1) {
                game = pendingGames[gameIndex];
                remotePlayers.forEach(player => game.addPlayer(player));
            } else {
                game = createNewGame(remotePlayers, gameType);
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
});

server.listen(8002, () => {
    console.log(`🎮 Game Service WebSocket listening on ${process.env.GAME_SERVICE_URL}`);
});
