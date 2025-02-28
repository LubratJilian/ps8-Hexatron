const {createServer} = require("node:http");
const controller = require("./controller");
const {parseRequestPath, HttpError} = require("./utils");
const {generateDocumentationAPI} = require("api");
const {options} = require("./api-utils");

function handleError(req, res, error) {
    console.error(`[${new Date().toISOString()}] [${req.method}] ${req.url} - Error:`, error);

    const statusCode = error.status || 500;
    const message = statusCode === 500 ? "Internal Server Error" : error.message;
    res.writeHead(statusCode, {"Content-Type": "application/json"});
    res.end(JSON.stringify({error: message}));
}

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
         *                   $ref: '#/components/schemas/login_register_answer'
         *                 examples:
         *                   creationExample:
         *                     $ref: '#/components/schemas/login_register_answer/examples/creationExample'
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
         *            $ref: '#/components/schemas/connection_user'
         *     responses:
         *       200:
         *         description: The response consists of an access token, a refresh token, and the user's data, excluding the ID, password, and answers.
         *         content:
         *             application/json:
         *                 schema:
         *                   $ref: '#/components/schemas/login_register_answer'
         *                 examples:
         *                   loginExample:
         *                     $ref: '#/components/schemas/login_register_answer/examples/loginExample'
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
         *            $ref: '#/components/schemas/returned_user'
         *           examples:
         *             nameOnly:
         *                $ref: '#/components/schemas/returned_user/examples/nameOnly'
         *             parametersOnly:
         *                $ref: '#/components/schemas/returned_user/examples/parametersOnly'
         *             nameAndParameters:
         *                $ref: '#/components/schemas/returned_user/examples/default'
         *     responses:
         *       200:
         *         description: The response consists of an access token, a refresh token, and the user's data, excluding the ID, password, and answers.
         *         content:
         *             application/json:
         *                 schema:
         *                   $ref: '#/components/schemas/update_answer'
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