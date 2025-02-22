const {createServer} = require("node:http");
const controller = require("./controller");
const {parseRequestPath, HttpError} = require("./utils");

function handleError(req, res, error) {
    console.error(`[${new Date().toISOString()}] [${req.method}] ${req.url} - Error:`, error);

    const statusCode = error.status || 500;
    const message = statusCode === 500 ? "Internal Server Error" : error.message;
    res.writeHead(statusCode, {"Content-Type": "application/json"});
    res.end(JSON.stringify({error: message}));
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
        method: "POST",
        path: ["register"],
        handler: controller.register,
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