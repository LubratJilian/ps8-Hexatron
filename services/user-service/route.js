const {createServer} = require("node:http");
const controller = require("./controller");
const {parseRequestPath, HttpError} = require("./utils");
const {generateDocumentationAPI} = require("api");
const {
    userJson,
    returnedUser,
    connectionUser,
    partialUser,
    userExample,
    partialUserExampleNameOnly,
    partialUserExample,
    partialUserExampleParametersOnly,
    returnedUserExample,
    connectionUserExample
} = require("../database-initializer/type-documentation");

function handleError(req, res, error) {
    console.error(`[${new Date().toISOString()}] [${req.method}] ${req.url} - Error:`, error);

    const statusCode = error.status || 500;
    const message = statusCode === 500 ? "Internal Server Error" : error.message;
    res.writeHead(statusCode, {"Content-Type": "application/json"});
    res.end(JSON.stringify({error: message}));
}

const options = {
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
                    properties: returnedUser,
                    example: returnedUserExample
                },
                connectionUser: {
                    type: "object",
                    properties: connectionUser,
                    example: connectionUserExample
                },
                partialUser: {
                    type: "object",
                    properties: partialUser,
                    examples: {
                        nameOnly: {
                            value: partialUserExampleNameOnly
                        },
                        parametersOnly: {
                            value: partialUserExampleParametersOnly
                        },
                        nameAndParameters: {
                            value: partialUserExample
                        }
                    }
                },
                loginAndRegisterAnswer: {
                    type: "object",
                    properties: {
                        message: {
                            type: "string"
                        },
                        user: {
                            type: "object",
                            properties: returnedUser
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
                        },
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
console.log(userJson, userExample);
try {
    generateDocumentationAPI(process.env.USER_API, options);
} catch (error) {
    console.error(`Error during the creation of API documentation: ${error}`);
}

function parseRequestBody(request) {
    return new Promise((resolve, reject) => {
        let body = "";
        request.on("data", (chunk) => (body += chunk.toString()));

        request.on("end", () => {
            if (!body.trim())
                return resolve({});
            try {
                resolve(JSON.parse(body));
            } catch (e) {
                reject(new HttpError(400, "Invalid JSON"));
            }
        });

        request.on("error", (error) => reject(error));
    });
}

function extractProperties(obj, properties) {
    return properties.reduce((res, prop) => {
        if (obj.hasOwnProperty(prop)) {
            res[prop] = obj[prop];
        }
        return res;
    }, {});
}

function createResponseExample(message, fields = ["message", "user", "accessToken", "refreshToken"]) {
    let value = extractProperties({
        message: message,
        user: returnedUserExample,
        accessToken: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySUQiOiI2N2FhNDc4M2MwZGMwYTM3YTUxM2MwYjciLCJpYXQiOjE3MzkyMTMzMzYsImV4cCI6MTczOTIxNDIzNn0.2iIKH4d9dSnS7p9-8148MEHIBvgxTdTpl8JhJGHZYm0",
        refreshToken: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySUQiOiI2N2FhNDc4M2MwZGMwYTM3YTUxM2MwYjciLCJpYXQiOjE3MzkyMTI2NzUsImV4cCI6MTczOTIxMzU3NX0.5ZPptwWS6TZ8CGqSpKB0pZ4vzMXYCPKrTWzKq-hJfP8"
    }, fields)
    return {value: value};
}

const routes = [
    {
        /**
         * @swagger
         * /api/user/register:
         *   post:
         *     summary: Register a new user
         *     description: Create a new user in the database according to the values sent by the client.
         *     tags:
         *       - "User service"
         *     requestBody:
         *       description: Information about the user to register.
         *       required: true
         *       content:
         *         application/json:
         *           schema:
         *            $ref: '#/components/schemas/user'
         *     responses:
         *       201:
         *         description: The response consists of an access token, a refresh token, and the user's data, excluding the ID, password, and answers.
         *         content:
         *             application/json:
         *                 schema:
         *                   $ref: '#/components/schemas/loginAndRegisterAnswer'
         *                 examples:
         *                   creationExample:
         *                     $ref: '#/components/schemas/loginAndRegisterAnswer/examples/creationExample'
         *       409:
         *         description: Username already exists
         *       400:
         *         description: Invalid user data format
         *       500:
         *        description: Internal Server Error
         */
        method: "POST",
        path: ["register"],
        handler: controller.register,
    },
    {
        /**
         * @swagger
         * /api/user/doc:
         *   get:
         *     summary: Get the API
         *     description: Return the API documentation to the sender of the request.
         *     tags:
         *       - User service
         *     responses:
         *       200:
         *         description: The API converted to the JSON format and stringify.
         *       500:
         *         content:
         *           application/json:
         *             schema:
         *               type: object
         *               properties:
         *                 error:
         *                   type: string
         *                   example: "Failed to read API documentation"
         *                 details:
         *                   type: string
         *                   example: "Error message here"
         */
        method: "GET",
        path: ["doc"],
        handler: controller.documentation
    },
    {
        /**
         * @swagger
         * /api/user/login:
         *   post:
         *     summary: Login to the game
         *     description: Login to an existing user account in the database using the username and password.
         *     tags:
         *       - User service
         *     requestBody:
         *       description: Username and password for authentication.
         *       required: true
         *       content:
         *         application/json:
         *           schema:
         *            $ref: '#/components/schemas/connectionUser'
         *     responses:
         *       200:
         *         description: The response consists of an access token, a refresh token, and the user's data, excluding the ID, password, and answers.
         *         content:
         *             application/json:
         *                 schema:
         *                   $ref: '#/components/schemas/loginAndRegisterAnswer'
         *                 examples:
         *                   creationExample:
         *                     $ref: '#/components/schemas/loginAndRegisterAnswer/examples/loginExample'
         *       401:
         *         description: Invalid credentials
         *       500:
         *         description: Token generation failed or Internal Server Error
         */
        method: "POST",
        path: ["login"],
        handler: controller.login,
    },
    {
        /**
         * @swagger
         * /api/user/me:
         *   patch:
         *     summary: Modify a registered user
         *     description: Modify the name and/or parameters of a registered user with new values.
         *     tags:
         *       - User service
         *     parameters:
         *       - $ref: '#/components/parameters/AuthorizationHeader'
         *     requestBody:
         *       description: New name and/or parameters
         *       required: true
         *       content:
         *         application/json:
         *           schema:
         *            $ref: '#/components/schemas/partialUser'
         *           examples:
         *             nameOnly:
         *                $ref: '#/components/schemas/partialUser/examples/nameOnly'
         *             parametersOnly:
         *                $ref: '#/components/schemas/partialUser/examples/parametersOnly'
         *             nameAndParameters:
         *                $ref: '#/components/schemas/partialUser/examples/nameAndParameters'
         *     responses:
         *       200:
         *         description: The response consists of an access token, a refresh token, and the user's data, excluding the ID, password, and answers.
         *         content:
         *             application/json:
         *                 schema:
         *                   $ref: '#/components/schemas/updateAnswer'
         *       409:
         *         description: Username already exists
         *       400:
         *         description: Invalid data format
         *       404:
         *         description: User not found
         *       500:
         *        description: Internal server error during update
         */
        method: "PATCH",
        path: ["me"],
        handler: controller.update,
    },
    {
        /**
         * @swagger
         * /api/user/refreshToken:
         *   post:
         *     summary: Generate a new access token
         *     description: Generate a new access token, using the refresh token for authentication.
         *     tags:
         *       - User service
         *     parameters:
         *       - $ref: '#/components/parameters/AuthorizationHeader'
         *     responses:
         *       200:
         *         description: The response consists of an access token, a refresh token, and the user's data, excluding the ID, password, and answers.
         *         content:
         *             application/json:
         *                 schema:
         *                   $ref: '#/components/schemas/refreshToken'
         *       401:
         *         description: No refresh token found. Please log in again
         *       500:
         *        description: Failed to generate new access token or Internal Server Error
         */
        method: "POST",
        path: ["refreshToken"],
        handler: controller.refreshToken
    },
    {
        /**
         * @swagger
         * /api/user/resetPassword:
         *   post:
         *     summary: Reset the Password
         *     description: Replace the password of a given user with a new one.
         *     tags:
         *       - User service
         *     requestBody:
         *       description: Username and answers for authentication and a new password.
         *       required: true
         *       content:
         *         application/json:
         *           schema:
         *            $ref: '#/components/schemas/resetPassword'
         *     responses:
         *       201:
         *         description: Password has been successfully reset.
         *       401:
         *         description: Security answers do not match
         *       404:
         *         description: User not found
         *       500:
         *        description: Internal Server Error
         */
        method: "POST",
        path: ["resetPassword"],
        handler: controller.resetPassword
    },
    {
        /**
         * @swagger
         * /api/user/disconnect:
         *   post:
         *     summary: Disconnect the user
         *     description: Disconnect the user by removing the refresh token from the database.
         *     tags:
         *       - User service
         *     parameters:
         *       - $ref: '#/components/parameters/AuthorizationHeader'
         *     responses:
         *       204:
         *         description: User has been successfully disconnected.
         *       404:
         *         description: User was not logged in or already logged out
         *       500:
         *        description: Internal Server Error
         */
        method: "POST",
        path: ["disconnect"],
        handler: controller.disconnect
    },
    {
        /**
         * @swagger
         * /api/user/updatePassword:
         *   patch:
         *     summary: Modify the password of a user
         *     description: Modify a user's password in the database by verifying the previous password.
         *     tags:
         *       - User service
         *     parameters:
         *       - $ref: '#/components/parameters/AuthorizationHeader'
         *     requestBody:
         *       description: Old password and new password
         *       required: true
         *       content:
         *         application/json:
         *           schema:
         *            $ref: '#/components/schemas/newPassword'
         *     responses:
         *       200:
         *         description: Password successfully updated.
         *       400:
         *         description: Invalid password format
         *       401:
         *         description: Current password is incorrect
         *       404:
         *         description: User not found
         *       500:
         *        description: Internal server error during update
         */
        method: "POST",
        path: ["updatePassword"],
        handler: controller.updatePassword
    },
    {
        /**
         * @swagger
         * /api/user/me:
         *   delete:
         *     summary: Delete the user
         *     description: Delete the user from the database
         *     tags:
         *       - User service
         *     parameters:
         *       - $ref: '#/components/parameters/AuthorizationHeader'
         *     responses:
         *       204:
         *         description: User has been successfully deleted.
         *       404:
         *         description: User was not logged in or already logged out
         *       500:
         *        description: Internal Server Error
         */
        method: "DELETE",
        path: ["me"],
        handler: controller.delete
    },
    {
        /**
         * @swagger
         * /api/user/health:
         *   get:
         *     summary: Health check for Docker
         *     description: Health check to determine if the service is ready to use.
         *     tags:
         *       - User service
         *     responses:
         *       204:
         *          description:
         */
        method: "GET",
        path: ["health"],
        handler: controller.health
    }
];

module.exports = createServer(async (req, res) => {
    try {
        const path = parseRequestPath(req);
        const route = routes.find(
            (route) =>
                route.method === req.method &&
                (route.path[0] === "*" || route.path.every((segment, index) => segment.startsWith(":") || segment === path[index]))
        );

        if (!route)
            throw new HttpError(404, "Route not found");

        req.body = await parseRequestBody(req);
        await route.handler(req, res);
    } catch (error) {
        handleError(req, res, error);
    }
});