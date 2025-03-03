const {GameType, Game} = require("./Game");
const {defaultMovementsMapping, Directions, MovementTypes, DISPLACEMENT_FUNCTIONS} = require("./GameUtils");
const PlayerState = require("./PlayerState");
const {PlayerType} = require("./Player");
const {ROUND_END, POSITIONS_UPDATED, GAME_END} = require("./GameStatus");
const MiniMaxAI = require("./ai/MiniMaxAI");
const crypto = require("crypto");

class GameEngine {
    constructor(players, gameType, rowNumber, columnNumber, roundsCount, playersCount, eventHandler, choiceTimeout = 250, setupTimeout = 1000) {
        this._eventHandler = eventHandler;
        this._id = crypto.randomUUID();
        this._playersCount = playersCount;
        this._choiceTimeout = choiceTimeout;
        this._setupTimeout = setupTimeout;
        this._remainingPlayers = {};
        this._disconnectedPlayers = new Set();

        if (!Object.values(GameType).includes(gameType) || GameType === GameType.FRIENDLY)
            throw new Error(`The game type ${gameType} is not yet supported`);

        this.initGame(players, gameType, playersCount, rowNumber, columnNumber, roundsCount);
    }

    get id() {
        return this._id;
    }

    get playersCount() {
        return this._playersCount;
    }

    get game() {
        return this._game;
    }

    initGame(players, gameType, playersCount, rowNumber, columnNumber, roundsCount) {
        if (players.length > playersCount)
            throw new Error(`Too many users for this game. Maximum allowed: ${playersCount}, received: ${players.length}`);

        let mappedPlayers = new Map(players.map(player => [player.id, player]));

        if (gameType === GameType.AI) {
            for (let i = players.length; i < playersCount; i++) {
                let id = crypto.randomUUID();
                mappedPlayers.set(id, new MiniMaxAI(id, `MinMaxAI ${i}`));
            }
        }

        this._game = new Game(gameType, rowNumber, columnNumber, mappedPlayers, roundsCount);
    }

    remapMovements(playerId, diff) {
        for (const [inputKey, directionValue] of Object.entries(this._playersMovements[playerId]))
            this._playersMovements[playerId][inputKey] = (directionValue + diff + 6) % 6;
    }

    initializePlayersDirections() {
        this._playersMovements = {};

        for (const playerId of Object.keys(this._remainingPlayers)) {
            this._playersMovements[playerId] = {...defaultMovementsMapping};

            const playerColumn = Number(this._game.getPlayerPosition(playerId).column);
            const defaultDirection = playerColumn === 1
                ? Directions.RIGHT
                : Directions.LEFT;

            const rotationDiff = Directions.RIGHT - defaultDirection;

            this.remapMovements(playerId, rotationDiff);
        }
    }

    async wrapWithTimeout(methodCall, timeout, defaultValue) {
        const resultPromise = Promise.race([
            methodCall,
            new Promise(resolve =>
                setTimeout(() => resolve(defaultValue), timeout)
            )
        ]);

        const minDelayPromise = new Promise(resolve =>
            setTimeout(resolve, timeout)
        );

        const [result] = await Promise.all([resultPromise, minDelayPromise]);

        return result;
    }

    async initialize() {
        this._game.setPlayersStartPositions();

        this.emitGameUpdate({
            status: POSITIONS_UPDATED,
            data: {newPositions: this.game.playersPositions}
        });

        this._remainingPlayers = Object.fromEntries(this._game.players);

        this.initializePlayersDirections();

        const setupPromises = [];
        for (const player of Object.values(this._remainingPlayers)) {
            const playerPosition = this._game.getPlayerPosition(player.id);
            const setupPromise = this.wrapWithTimeout(
                player.setup(this.getPlayerState(player)),
                this._setupTimeout,
                undefined,
                `Setup timeout for player ${player.id}: `
            );

            setupPromises.push(setupPromise.then(() => {
                this._game.setPlayerPosition(player.id, playerPosition);
            }));
        }

        await Promise.all(setupPromises);
    }

    getPlayerState(player) {
        let playerPosition = this._game.getPlayerPosition(player.id);
        let opponentPosition = Object.keys(this._remainingPlayers)
            .filter(playerId => playerId !== player.id)
            .map(playerId => this._game.getPlayerPosition(playerId))[0];

        return new PlayerState(playerPosition, opponentPosition);
    }

    updateDirectionMapping(playerId, direction) {
        const newDirection = this._playersMovements[playerId][direction];
        const diff = newDirection - this._playersMovements[playerId][MovementTypes.KEEP_GOING];

        this.remapMovements(playerId, diff);
    }

    async computeNewPositions() {
        const movePromises = Object.values(this._remainingPlayers).map(player =>
            this.wrapWithTimeout(
                player.nextMove(this.getPlayerState(player)),
                this._choiceTimeout,
                MovementTypes.KEEP_GOING,
                `Move timeout for player ${player.id}: `
            )
        );

        const movements = await Promise.all(movePromises);
        const newPositions = {};

        movements.forEach((movement, i) => {
            const player = Object.values(this._remainingPlayers)[i];
            const direction = this._playersMovements[player.id][movement];

            this.updateDirectionMapping(player.id, movement);

            const pos = DISPLACEMENT_FUNCTIONS[direction](
                this._game.getPlayerPosition(player.id)
            );

            if (this._game.board.checkPositionValidity(pos))
                newPositions[player.id] = pos;
        });

        return newPositions;
    }

    identifyTies(positions) {
        if (!Object.keys(positions).length) {
            const remainingPlayers = [Object.keys(this._remainingPlayers)];
            this._remainingPlayers = {};
            return remainingPlayers;
        }

        let ties = new Map();
        let involvedPlayers = new Set();

        const playerIds = Object.keys(positions);
        for (let i = 0; i < playerIds.length; i++) {
            for (let j = i + 1; j < playerIds.length; j++) {
                const playerId1 = playerIds[i];
                const playerId2 = playerIds[j];
                const posKey = JSON.stringify(positions[playerId1]);

                if (positions[playerId1].equals(positions[playerId2])) {
                    if (!ties.has(posKey))
                        ties.set(posKey, new Set([playerId1, playerId2]));
                    else
                        ties.get(posKey).add(playerId2);

                    involvedPlayers.add(playerId1);
                    involvedPlayers.add(playerId2);
                }
            }
        }

        this._remainingPlayers = Object.fromEntries(playerIds.filter(playerId => !involvedPlayers.has(playerId))
            .map(id => [id, this._game.getPlayer(id)]));

        return [...ties.values()].map(set => [...set]);
    }

    disconnectPlayer(playerId) {
        this._disconnectedPlayers.add(playerId);
        return this.isGameEmpty();
    }

    isGameEmpty() {
        const nonAIPlayers = Array.from(this.game.players.values())
            .filter(player => player.playerType !== PlayerType.AI);

        return this._disconnectedPlayers.size === nonAIPlayers.length;
    }

    async wait(delay = 5000) {
        await new Promise(resolve => setTimeout(resolve, delay));
    }

    async start() {
        await this.wait(1000);
        for (let round = 0; (round < this._game.roundsCount) && !this.isGameEmpty(); round++) {
            const result = await this.runRound();
            this.emitGameUpdate({
                status: ROUND_END, data: {
                    ...result,
                    round: round
                }
            });
            this._game.resetBoard();
        }
        this.emitGameUpdate({status: GAME_END});
    }

    addPlayer(player) {
        this.game.players.set(player.id, player);
    }

    async runRound() {
        await this.initialize();

        while (true) {
            const validPositions = await this.computeNewPositions();
            const ties = this.identifyTies(validPositions);
            const remainingIds = Object.keys(this._remainingPlayers);

            if (!remainingIds.length)
                return {status: "tie", ties};

            for (const player of Object.values(this._remainingPlayers)) {
                const newPos = validPositions[player.id];

                this._game.setPlayerPosition(player.id, newPos);
            }

            this.emitGameUpdate({
                status: POSITIONS_UPDATED,
                data: {newPositions: this.game.playersPositions}
            });

            if (remainingIds.length === 1) {
                return {status: "winner", winner: remainingIds[0]};
            }
        }
    }

    emitGameUpdate(data) {
        this._eventHandler(this.id, "refreshStatus", data);
    }
}

module.exports = GameEngine;