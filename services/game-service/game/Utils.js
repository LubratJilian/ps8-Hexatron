const GAME_SETTINGS = Object.freeze({
    ROW_NUMBER: 9,
    COL_NUMBER: 16,
    ROUNDS_COUNT: 3,
    PLAYERS_COUNT: 2,
});

function getRandomInt(max) {
    return Math.floor(Math.random() * max);
}

module.exports = {getRandomInt, GAME_SETTINGS};