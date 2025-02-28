const {userJson} = require("../database-initializer/type-documentation");

const userExample = {
    name: "Champion39",
    parameters: "parameters",
    password: "password1234",
    answers: ["Lacroix", "Rennes", "Mars attack"]
};

const extractProperties = (obj, properties) => {
    return properties.reduce((res, prop) => {
        if (obj.hasOwnProperty(prop)) {
            res[prop] = obj[prop];
        }
        return res;
    }, {});
};

function createResponseExample(message, fields = ["message", "user", "accessToken", "refreshToken"]) {
    let value = extractProperties({
        message: message,
        user: extractProperties(userExample, ["name", "parameters"]),
        accessToken: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySUQiOiI2N2FhNDc4M2MwZGMwYTM3YTUxM2MwYjciLCJpYXQiOjE3MzkyMTMzMzYsImV4cCI6MTczOTIxNDIzNn0.2iIKH4d9dSnS7p9-8148MEHIBvgxTdTpl8JhJGHZYm0",
        refreshToken: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySUQiOiI2N2FhNDc4M2MwZGMwYTM3YTUxM2MwYjciLCJpYXQiOjE3MzkyMTI2NzUsImV4cCI6MTczOTIxMzU3NX0.5ZPptwWS6TZ8CGqSpKB0pZ4vzMXYCPKrTWzKq-hJfP8"
    }, fields);
    return {value: value};
}

exports.options = {
    definition: {
        openapi: "3.0.0",
        info: {
            title: "API Documentation",
            version: "1.0.0"
        },
        basePath: "/api/user",
        tags: [{
            name: "User service",
            description: "Api of the user-service"
        }],
        components: {
            parameters: {
                AuthorizationHeader: {
                    in: "header",
                    name: "Authorization",
                    required: true,
                    description: "Bearer token for authentication",
                    schema: {
                        type: "string",
                        example: "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                    }
                }
            },
            schemas: {
                user: {
                    type: "object",
                    properties: userJson,
                    example: userExample
                },
                returnedUser: {
                    type: "object",
                    properties: extractProperties(userJson, ["name", "parameters"]),
                    examples: {
                        nameOnly: {
                            value: extractProperties(userExample, ["name", "parameters"])
                        },
                        parametersOnly: {
                            value: extractProperties(userExample, ["name", "parameters"])
                        },
                        default: {
                            value: extractProperties(userExample, ["name", "parameters"])
                        }
                    }
                },
                connectionUser: {
                    type: "object",
                    properties: extractProperties(userJson, ["name", "password"]),
                    example: extractProperties(userExample, ["name", "password"])
                },
                loginAndRegisterAnswer: {
                    type: "object",
                    properties: {
                        message: {
                            type: "string"
                        },
                        user: {
                            type: "object",
                            properties: extractProperties(userJson, ["name", "parameters"])
                        },
                        accessToken: {
                            type: "string"
                        },
                        refreshToken: {
                            type: "string"
                        }
                    },
                    examples: {
                        creationExample: createResponseExample("User successfully registered."),
                        loginExample: createResponseExample("User successfully logged in.")
                    }
                },
                updateAnswer: {
                    type: "object",
                    properties: {
                        message: {
                            type: "string"
                        },
                        user: {
                            type: "object",
                            properties: userJson
                        }
                    },
                    example: createResponseExample("User successfully updated.", ["message", "user"])
                },
                refreshToken: {
                    type: "object",
                    properties: {
                        message: {
                            type: "string"
                        },
                        accessToken: {
                            type: "string"
                        }
                    },
                    example: createResponseExample("New access token generated successfully.", ["message", "accessToken"])
                },
                resetPassword: {
                    type: "object",
                    properties: extractProperties(userJson, ["name", "answers", "password"]),
                    example: extractProperties(userExample, ["name", "answers", "password"])
                },
                newPassword: {
                    type: "object",
                    properties: {
                        oldPassword: userJson.password,
                        newPassword: userJson.password
                    },
                    example: {
                        oldPassword: "password1234",
                        newPassword: "1234password"
                    }
                }
            }
        }
    },
    apis: ["./route.js"]
};