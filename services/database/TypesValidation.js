const Parameters = {
    bsonType: "object",
    properties: {
        _keysPlayers: {
            bsonType: "array",
            items: {
                bsonType: "array",
                items: {
                    bsonType: "string"
                }
            }
        },
        _playersColors: {
            bsonType: "array",
            items: {
                bsonType: "string"
            }
        }
    }
};

const User = {
    name: {
        bsonType: "string",
        minLength: 4,
        maxLength: 20
    },
    parameters: {
        bsonType: "string",
    },
    password: {
        bsonType: "string",
        minLength: 8,
        maxLength: 64
    },
    answers: {
        bsonType: "array",
        minItems: 3,
        maxItems: 3,
        items: {
            bsonType: "string"
        }
    }
};

const RefreshToken = {
    userID: {
        bsonType: "string"
    },
    refreshToken: {
        bsonType: "string"
    }
};

exports.User = User;
exports.RefreshToken = RefreshToken;