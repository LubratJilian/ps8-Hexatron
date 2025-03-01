const PlayerType = {
    NORMAL: 0,
    AI: 1,
};

class Player {
    constructor(id, name) {
        this._id = id;
        this._name = name;
    }

    get playerType() {
        return PlayerType.NORMAL;
    }

    get id() {
        return this._id;
    }

    get name() {
        return this._name;
    }
}

module.exports = {Player, PlayerType};