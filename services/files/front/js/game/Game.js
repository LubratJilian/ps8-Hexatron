import {Board} from "./Board.js";
import {Position} from "./Position.js";
import {Directions, DISPLACEMENT_FUNCTIONS} from "./GameUtils.js";
import {UserService} from "../../services/user-service.js";

export const GameType = {
    LOCAL: 0,
    AI: 1,
    RANKED: 2
};

export class Game {
    constructor(type, rowNumber, columnNumber, players, roundsCount) {
        this._id = null;
        this._type = type;
        this._board = new Board(rowNumber, columnNumber);
        this._players = players;
        this._playersPositions = {};
        this._roundsCount = roundsCount;
    }

    get id() {
        return this._id;
    }

    set id(newId) {
        this._id = newId;
    }

    get players() {
        return this._players;
    }

    set players(players) {
        this._players = players;
    }

    get roundsCount() {
        return this._roundsCount;
    }

    get playersPositions() {
        return this._playersPositions;
    }

    get type() {
        return this._type;
    }

    getPlayer(playerId) {
        return this.players[playerId];
    }

    set playersPositions(playersPosition) {
        this._playersPositions = playersPosition;
    }

    obtainDirection(prevPosition, newPosition) {
        if (!prevPosition || prevPosition.equals(newPosition))
            return newPosition.column === 1
                ? Directions.RIGHT
                : Directions.LEFT;

        const displacementResults = DISPLACEMENT_FUNCTIONS.map((fun, index) => ({
            result: fun(prevPosition),
            index
        }));

        return displacementResults.find(({result}) => result.equals(newPosition)).index;
    }

    refreshBoard(playersPosition, context) {
        if (!context)
            return;

        Object.keys(this.players).forEach((playerId, i) => {
            const curPosition = new Position(...Object.values(playersPosition[playerId]));
            const prevPosition = this._playersPositions[playerId];

            this.board.update(
                prevPosition,
                curPosition,
                UserService.getInstance().user.parameters.playersColors[i],
                context,
                this.obtainDirection(prevPosition, curPosition)
            );

            this._playersPositions[playerId] = curPosition;
        });
    }

    getPlayerPosition(playerId) {
        return this._playersPositions[playerId];
    }

    setPlayerPosition(playerId, position) {
        this._playersPositions[playerId] = position;
        this.board.fillTile(position, "black", Directions.UPPER_RIGHT, this._context, false);
    }

    get board() {
        return this._board;
    }

    resetBoard(context) {
        this._board.initialize();
        context.reset();
        this.draw(context);
    }

    draw(context) {
        if (!context)
            return;

        this.board.draw(context);
    }
}