const {createServer} = require("node:http");
const controller = require("./controller");
const {parseRequestPath, HttpError} = require("./utils");
const {generateDocumentationAPI} = require("api");
const {UserJson} = require("../database-initializer/TypesValidation");

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
        servers: [
            {
                url: "http://user-service:8003",
                description: "User Service"
            }
        ],
        basePath: "/api/user",
        components: {
            schemas: {
                user: {
                    type: "object",
                    properties: UserJson,
                    example: {
                        name: "Test1234",
                        parameters: "Test",
                        password: "ThisIsATest",
                        answers: ["test", "test", "test"]
                    }
                }
            }
        }
    },
    apis: ["./route.js"]
};
console.log(UserJson);
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
         *     description: Create a new user in the database
         *     requestBody:
         *       description: Les informations de l'utilisateur à enregistrer
         *       required: true
         *       content:
         *         application/json:
         *           schema:
         *            $ref: '#/components/schemas/user'
         *     responses:
         *       201:
         *         description: User successfully registered.
         *       409:
         *         description: Username already exists
         *       400:
         *         description: Invalid user data format
         *       500:
         *         description: Internal Server Error
         */
        method: "POST",
        path: ["register"],
        handler: controller.register,
    },
    {
        method: "GET",
        path: ["doc"],
        handler: controller.documentation
    },
    {
        method: "POST",
        path: ["login"],
        handler: controller.login,
    },
    {
        method: "PATCH",
        path: ["me"],
        handler: controller.update,
    },
    {
        method: "POST",
        path: ["refreshToken"],
        handler: controller.refreshToken
    },
    {
        method: "POST",
        path: ["resetPassword"],
        handler: controller.resetPassword
    },
    {
        method: "POST",
        path: ["disconnect"],
        handler: controller.disconnect
    },
    {
        method: "POST",
        path: ["updatePassword"],
        handler: controller.updatePassword
    },
    {
        method: "DELETE",
        path: ["me"],
        handler: controller.delete
    },
    {
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