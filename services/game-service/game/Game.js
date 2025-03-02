const Board = require("./Board");
const Position = require("./Position");
const {getRandomInt} = require("./Utils");
const {Status} = require("./Tile");

const GameType = {
    LOCAL: 0,
    AI: 1,
    RANKED: 2
};

class Game {
    constructor(type, rowNumber, columnNumber, players, roundsCount) {
        this._type = type;
        this._board = new Board(rowNumber, columnNumber);
        this._players = players;
        this._playersPositions = {};
        this._roundsCount = roundsCount;
    }

    get players() {
        return this._players;
    }

    get roundsCount() {
        return this._roundsCount;
    }

    get playersPositions() {
        return this._playersPositions;
    }

    set playersPositions(playersPosition) {
        this._playersPositions = playersPosition;
        Object.values(playersPosition).forEach(pos => this.board.setTileStatus(pos, Status.TAKEN));
    }

    get type() {
        return this._type;
    }

    get board() {
        return this._board;
    }

    getPlayer(playerId) {
        return this.players.get(playerId);
    }

    getPlayerPosition(playerId) {
        return this._playersPositions[playerId];
    }

    setPlayerPosition(playerId, position) {
        this._playersPositions[playerId] = position;
        this.board.setTileStatus(position, Status.TAKEN);
    }

    resetBoard() {
        this._board.initialize();
    }

    generatePossibleStartPositions() {
        let possibleRows = [];

        for (let i = 1; i < this.board.rowCount; i += 2)
            possibleRows.push(i);

        const firstPlayerPos = new Position(possibleRows[getRandomInt(possibleRows.length)], 1);
        const secondPlayerPos = new Position(
            this.board.rowCount - firstPlayerPos.row - 1,
            this.board.columnCount - 2
        );
        const thirdPlayerPos = new Position(secondPlayerPos.row, 1);
        const fourthPlayerPos = new Position(firstPlayerPos.row, this.board.columnCount - 2);

        return [firstPlayerPos, secondPlayerPos, thirdPlayerPos, fourthPlayerPos];
    }

    setPlayersStartPositions() {
        let playersLength = this.players.size;
        if (playersLength < 1 || playersLength > 4)
            throw new Error("Unsupported number of players.");

        let possiblePositions = this.generatePossibleStartPositions();
        let playerIds = Array.from(this.players.keys());

        this.playersPositions = Object.fromEntries(
            playerIds.map((playerId, index) => [playerId, possiblePositions[index]])
        );
    }

}

module.exports = {Game, GameType};