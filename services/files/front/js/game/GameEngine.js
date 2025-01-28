import {Game, GameType} from "./Game.js";
import {defaultMovementsMapping, Directions, DISPLACEMENT_FUNCTIONS, MovementTypes} from "./GameUtils.js";
import {PlayerFactory} from "./PlayerFactory.js";
import {PlayerState} from "../ai/PlayerState.js";
import {LocalPlayer} from "./LocalPlayer.js";

export class GameEngine {
    constructor(users, gameType, rowNumber, columnNumber, roundsCount, playersCount, context, choiceTimeout = 250, setupTimeout = 1000) {
        this._canvas = context;
        this._choiceTimeout = choiceTimeout;
        this._setupTimeout = setupTimeout;

        switch (gameType) {
            case GameType.LOCAL:
            case GameType.AI:
                this.initGame(users[0], gameType, playersCount, rowNumber, columnNumber, roundsCount);
                break;
            default:
                throw new Error(`The ${gameType} game type is not yet supported.`);
        }
    }

    initGame(user, gameType, playersCount, rowNumber, columnNumber, roundsCount) {
        let players = {["0"]: new LocalPlayer("0", user.name, user.parameters.playersColors[0], null, user.parameters.keys[0])};

        for (let i = 1; i < playersCount; i++) {
            players[`${i}`] = PlayerFactory.createPlayer(
                gameType,
                `${i}`,
                user.parameters.playersColors[i],
                gameType === GameType.LOCAL ? user.parameters.keys[i] : null
            );
        }

        this._game = new Game(gameType, rowNumber, columnNumber, players, roundsCount);
    }

    remapMovements(playerId, diff) {
        for (const [inputKey, directionValue] of Object.entries(this._playersDirections[playerId].movementsMapping))
            this._playersDirections[playerId].movementsMapping[inputKey] = (directionValue + diff + 6) % 6;
    }

    initializePlayersDirections() {
        this._playersDirections = {};
        for (const playerId of Object.keys(this._game.players)) {
            this._playersDirections[playerId] = {
                movementsMapping: {...defaultMovementsMapping},
                comingDirection: null
            };

            const playerColumn = Number(this._game.getPlayerPosition(playerId).column);
            const defaultDirection = playerColumn === 1
                ? Directions.RIGHT
                : Directions.LEFT;

            this._playersDirections[playerId].comingDirection = defaultDirection;
            const rotationDiff = Directions.RIGHT - defaultDirection;

            this.remapMovements(playerId, rotationDiff);
        }
    }

    async wrapWithTimeout(methodCall, timeout, defaultValue, errorMessage) {
        try {
            return await Promise.race([
                methodCall,
                new Promise(resolve =>
                    setTimeout(() => resolve(defaultValue), timeout)
                )
            ]);
        } catch (e) {
            console.error(errorMessage, e);
            return defaultValue;
        }
    }

    async initialize() {
        this._game.setPlayersStartPositions();
        this._game.draw(this._canvas);

        this.initializePlayersDirections();

        const setupPromises = [];
        for (const player of Object.values(this._game.players)) {
            const playerPosition = this._game.getPlayerPosition(player.id);
            const setupPromise = this.wrapWithTimeout(
                player.setup(this.getPlayerState(player)),
                this._setupTimeout,
                undefined,
                `Setup timeout for player ${player.id}: `
            );

            setupPromises.push(setupPromise.then(() => {
                this._game.board.update(
                    null,
                    playerPosition,
                    player.color,
                    this._canvas,
                    this._playersDirections[player.id].comingDirection
                );
            }));
        }

        await Promise.all(setupPromises);
    }

    async start() {
        for (let round = 0; round < this._game.roundsCount; round++) {
            const result = await this.runRound();
            this.printResults(result);
            this._game.resetBoard(this._canvas);
        }
    }

    getPlayerState(player) {
        let playerPosition = this._game.getPlayerPosition(player.id);
        let opponentPosition = Object.entries(this._game.playersPositions).find(([k, _]) => k !== player.id)?.[1];

        return new PlayerState(playerPosition, opponentPosition);
    }

    updateDirectionMapping(playerId, direction) {
        const newDirection = this._playersDirections[playerId].movementsMapping[direction];
        const diff = newDirection - this._playersDirections[playerId].comingDirection;

        this._playersDirections[playerId].comingDirection = newDirection;

        this.remapMovements(playerId, diff);
    }

    async computeNewPositions() {
        const movePromises = Object.values(this._game.players).map(player =>
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
            const player = Object.values(this._game.players)[i];
            const direction = this._playersDirections[player.id].movementsMapping[movement];

            this.updateDirectionMapping(player.id, movement);

            const pos = DISPLACEMENT_FUNCTIONS[direction](
                this._game.getPlayerPosition(player.id)
            );

            if (this._game.board.checkPositionValidity(pos))
                newPositions[player.id] = pos;
        });

        return newPositions;
    }

    checkEqualities(positions) {
        let equals = {};
        const playerIds = Object.keys(positions);

        for (let i = 0; i < playerIds.length; i++) {
            for (let j = i + 1; j < playerIds.length; j++) {
                const playerId1 = playerIds[i];
                const playerId2 = playerIds[j];

                if (positions[playerId1].equals(positions[playerId2])) {
                    if (!equals[positions[playerId1]])
                        equals[positions[playerId1]] = new Set([playerId1, playerId2]);
                    else
                        equals[positions[playerId1]].add(playerId2);
                }
            }
        }

        return Object.keys(equals).length ? Object.values(equals) : null;
    }

    async runRound() {
        await this.initialize();

        while (true) {
            const validPositions = await this.computeNewPositions();
            const equalities = this.checkEqualities(validPositions);

            if (equalities)
                return {status: "equality", equalities};

            const remainingPlayers = Object.keys(validPositions);
            if (remainingPlayers.length !== Object.keys(this._game.players).length) {
                return {status: "round_end", winners: remainingPlayers};
            }

            for (const playerId of remainingPlayers) {
                const player = this._game.getPlayer(playerId);
                const newPos = validPositions[playerId];

                this._game.board.update(
                    this._game.getPlayerPosition(playerId),
                    newPos,
                    player.color,
                    this._canvas,
                    this._playersDirections[playerId].comingDirection
                );
                this._game.setPlayerPosition(playerId, newPos);
            }
        }
    }

    printRoundEndResults(winners) {
        const winnersNames = winners.map(winnerId => this._game.getPlayer(winnerId).name);

        if (winners.length === 0)
            alert("All players have lost!");
        else if (winners.length === 1)
            alert(`The winner of this round is: ${winnersNames[0]}!`);
        else alert(`It's a tie between players: ${winnersNames.join(", ")}!`);
    }

    printEqualityResults(equalities) {
        let message = "";
        for (const equality of equalities) {
            message += "Equality between players: ";
            equality.forEach(playerId => message += this._game.getPlayer(playerId).name + ", ");
            message = message.slice(0, -2);
            message += "\n";
        }
        alert(message);
    }

    printResults(result) {
        switch (result.status) {
            case "equality":
                this.printEqualityResults(result.equalities);
                break;
            case "round_end":
                this.printRoundEndResults(result.winners);
                break;
            default:
                throw Error(`The status ${result.status} is not yet supported`);
        }
    }

    draw(callingContext) {
        callingContext._game.board.draw(callingContext._canvas);
    }
}