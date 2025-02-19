const {createServer} = require("node:http");
const controller = require("./controller");

function parseRequestPath(req) {
    const baseUrl = `http://${req.headers.host}`;
    const url = new URL(req.url, baseUrl);

    return url.pathname.split("/").filter(Boolean).slice(2);
}

function handleError(res, error) {
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
                reject({statusCode: 400, message: "Invalid JSON"});
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
        path: [":id"],
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
    }
];

module.exports = createServer(async (req, res) => {
    if (req.method === "OPTIONS") {
        res.writeHead(204, {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, PATCH, OPTIONS",
            "Access-Control-Allow-Headers": ["Content-Type", "Authorization"]
        });
        res.end();
        return;
    }

    try {
        const path = parseRequestPath(req);
        const route = routes.find(
            (route) =>
                route.method === req.method &&
                route.path.every((segment, index) => segment.startsWith(":") || segment === path[index])
        );

        if (!route) {
            handleError(res, {statusCode: 404, message: "Route not found"});
            return;
        }

        req.body = await parseRequestBody(req);
        await route.handler(req, res);
    } catch (error) {
        handleError(res, error);
    }
});