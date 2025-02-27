/* TYPE DEFINITION */
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
        maxLength: 20,
        pattern: "^[a-zA-Z0-9_\\-]+$"
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
            bsonType: "string",
            minLength: 1,
            maxLength: 50
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

/* EXAMPLES */
const userExample = {
    name: "Champion39",
    parameters: "parameters",
    password: "password1234",
    answers: ["Lacroix", "Rennes", "Mars attack"]
}

/* UTILS */
const bsonToJsonMap = new Map([
    ["double", "number"],
    ["string", "string"],
    ["object", "object"],
    ["array", "array"],
    ["binData", "string"],
    ["objectId", "string"],
    ["bool", "boolean"],
    ["date", "string"],
    ["null", "null"],
    ["regex", "string"],
    ["javascript", "string"],
    ["int", "number"],
    ["long", "number"],
    ["decimal128", "string"],
    ["timestamp", "string"],
    ["undefined", "null"],
    ["symbol", "string"],
    ["minKey", null],
    ["maxKey", null]
]);

/**
 * Function to convert MongoDB schema to JSON
 * @param {Object} schema - MongoDB schema
 * @returns {Object} - JSON schema for Swagger documentation
 */
function convertBsonToSwagger(schema) {
    console.log(schema);
    let swaggerSchema = {};
    for (let key in schema) {
        if (key === "bsonType") {
            swaggerSchema["type"] = bsonToJsonMap.get(schema[key]) || "string";
        } else if (typeof schema[key] === "object") {
            swaggerSchema[key] = convertBsonToSwagger(schema[key]);
        } else {
            swaggerSchema[key] = schema[key];
        }
    }
    return swaggerSchema;
}

const extractProperties = (obj, properties) => {
    return properties.reduce((res, prop) => {
        if (obj.hasOwnProperty(prop)) {
            res[prop] = obj[prop];
        }
        return res;
    }, {});
};

/* JSON */
const userJson = convertBsonToSwagger(User);
const refreshTokenJson = convertBsonToSwagger(RefreshToken);

/* EXPORTS */
exports.User = User;
exports.Parameters = Parameters;
exports.RefreshToken = RefreshToken;

exports.userJson = userJson;
exports.refreshTokenJson = refreshTokenJson;

exports.returnedUser = extractProperties(userJson, ["name", "parameters"]);
exports.connectionUser = extractProperties(userJson, ["name", "password"]);
exports.partialUser = extractProperties(userJson, ["name", "parameters"]);

exports.userExample = userExample;
exports.returnedUserExample = extractProperties(userExample, ["name", "parameters"]);
exports.connectionUserExample = extractProperties(userExample, ["name", "password"]);
exports.partialUserExampleNameOnly = extractProperties(userJson, ["name"]);
exports.partialUserExampleParametersOnly = extractProperties(userJson, ["parameters"]);
exports.partialUserExample = extractProperties(userJson, ["name", "parameters"]);
