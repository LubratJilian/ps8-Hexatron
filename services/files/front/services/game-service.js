import {Game, GameType} from "../js/game/Game.js";
import {LocalPlayer} from "../js/game/LocalPlayer.js";
import {CURRENT_USER} from "../js/UserMock.js";

export const GameStatus = {
    CREATED: 'CREATED',
    POSITIONS_UPDATED: 'POSITION_UPDATED',
    ROUND_END: 'ROUND_END',
    GAME_END: 'GAME_END',
};

export class GameService {
    static _instance = null;

    constructor() {
        if (GameService._instance)
            return GameService._instance;

        this._game = null;
        this._context = null;
        this._socket = io(`http://${window.location.hostname}/game`);

        this.socket.on("connect", () => {
            console.log("user connected " + this._socket.id);
        });

        this._listeners = {};
        this.setupListeners();

        window.addEventListener("routeChange", () => this.handleRouteChange());

        GameService._instance = this;
    }

    get socket() {
        if (!this._socket.connected)
            this._socket.connect();
        return this._socket;
    }

    reset() {
        this._game = null;
        this._context = null;
        this._socket.disconnect();
    }

    set context(context) {
        this._context = context;
    }

    handleRouteChange() {
        this.reset();
    }

    get game() {
        return this._game;
    }

    set game(newGame) {
        this._game = newGame;
    }

    static getInstance() {
        if (!GameService._instance) {
            GameService._instance = new GameService();
        }
        return GameService._instance;
    }

    off(eventName, callback) {
        if (this._listeners[eventName]) {
            this._listeners[eventName] = this._listeners[eventName].filter(
                cb => cb !== callback
            );

            if (this._listeners[eventName].length === 0) {
                delete this._listeners[eventName];
            }
        }
    }

    on(eventName, callback) {
        if (!this._listeners[eventName]) {
            this._listeners[eventName] = [];
        }
        this._listeners[eventName].push(callback);
    }

    emit(eventName, data) {
        if (this._listeners[eventName]) {
            this._listeners[eventName].forEach(callback => callback(data));
        }
    }

    setupListeners() {
        this.socket.on("refreshStatus", (receivedData) => {
            const {status, data} = receivedData;

            if (!this.game) {
                console.error("Game not initialized");
                return;
            }

            switch (status) {
                case GameStatus.CREATED:
                    this.handleGameCreated(data);
                    break;
                case GameStatus.POSITIONS_UPDATED:
                    this.handlePositionsUpdated(data);
                    break;
                case GameStatus.ROUND_END:
                    this.handleRoundEnd(data);
                    break;
                case GameStatus.GAME_END:
                    this.handleGameEnd();
                    break;
                default:
                    console.warn(`Unknown status received: ${status}`);
            }
        });

        this.errorListener();
    }

    handleGameCreated(data) {
        this.emit(GameStatus.CREATED);
        this.game.id = data.id;
        this.game.players = data.players;
    }

    handlePositionsUpdated(data) {
        this.game.refreshBoard(data.newPositions, this._context);
    }

    handleRoundEnd(data) {
        this.emit(GameStatus.ROUND_END, data);
        this.game.resetBoard(this._context);
        this.game.playersPositions = [];
    }

    errorListener() {
        this.socket.on("error", ({type, message}) => {
            console.error(`${type} -> ${message}`);
        });
    }

    handleGameEnd() {
        window.location.href = "/";
        this._game = null;
        this._context = null;
    }

    startGame(gameType, rowNumber, columnNumber, roundsCount, playersCount, context) {
        if (this.game?.id)
            return;

        const user = new LocalPlayer(CURRENT_USER.id, CURRENT_USER.name, CURRENT_USER.parameters.keys[0]);

        const users = [user];
        if (gameType === GameType.LOCAL) {
            const guest = new LocalPlayer("1", "Guest", CURRENT_USER.parameters.keys[1]);
            users.push(guest);
        }

        this._game = new Game(gameType, rowNumber, columnNumber, users, roundsCount, context);

        this.socket.emit("start", {
            gameType,
            rowNumber,
            columnNumber,
            roundsCount,
            playersCount,
            users: users.map(user => ({id: user.id, name: user.name}))
        });
    }

    draw() {
        if (this.game)
            this.game.draw(this._context);
    }

    nextMove(playerId, move) {
        this.socket.emit("nextMove", {gameId: this.game.id, playerId, move});
    }
}
