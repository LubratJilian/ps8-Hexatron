// The http module contains methods to handle http queries.
const http = require('http');
const httpProxy = require('http-proxy');
const {Server} = require('socket.io');
const jwt = require("jsonwebtoken");
const {io: Client} = require('socket.io-client');
const {addCors} = require("./cors");

// We will need a proxy to send requests to the other services.
const publicRoutes = ["login", "register"];
const jwtAccessSecretKey = process.env.ACCESS_TOKEN_SECRET;
const jwtRefreshSecretKey = process.env.REFRESH_TOKEN_SECRET;
const proxy = httpProxy.createProxyServer();

function checkAuthentication(req, res, access, next) {
    if (req.method === 'OPTIONS') {
        return next({userID: ""});
    }
    const token = req.headers["authorization"].split(" ")[1];
    if (!token) {
        res.statusCode = 401;
        return res.end("Unauthorized: No token provided");
    }
    try {
        let decoded;
        if (access) {
            decoded = jwt.verify(token, jwtAccessSecretKey);
        } else {
            decoded = jwt.verify(token, jwtRefreshSecretKey);
        }
        next(decoded);
    } catch (error) {
        res.statusCode = 498;
        res.end("Unauthorized: Invalid token");
    }
}

/* The http module contains a createServer function, which takes one argument, which is the function that
** will be called whenever a new request arrives to the server.
 */

const server = http.createServer(function (request, response) {
    // First, let's check the URL to see if it's a REST request or a file request.
    // We will remove all cases of "../" in the url for security purposes.
    addCors(response);
    let filePath = request.url.split("/").filter(function(elem) {
        return elem !== "..";
    });
    try {
        // If the URL starts by /api, then it's a REST request (you can change that if you want).
        if (filePath[1] === "api") {
            if (filePath[2] === "doc") {
                request.url = process.env.FILES_URL + "/swagger-ui-dist/index.html";
                proxy.web(request, response, {target: process.env.FILES_URL});
            } else if (filePath[2] === "user") {
                if (request.method === "OPTIONS") {
                    response.end();
                } else if (publicRoutes.includes(filePath[3].split("?")[0])) {
                    proxy.web(request, response, {target: process.env.USER_SERVICE_URL});
                } else {
                    checkAuthentication(request, response, filePath[3] !== "refreshToken", (token) => {
                        request.headers["x-user-id"] = token.userID;
                        proxy.web(request, response, {target: process.env.USER_SERVICE_URL});
                    });
                }
            } else {
                response.statusCode = 400;
                response.end();
            }
        // If it doesn't start by /api, then it's a request for a file.
        } else {
            console.log("Request for a file received, transferring to the file service")
            proxy.web(request, response, {target: process.env.FILES_URL});
        }
    } catch(error) {
        console.log(`error while processing ${request.url}: ${error}`)
        response.statusCode = 400;
        response.end(`Something in your request (${request.url}) is strange...`);
    }
// For the server to be listening to request, it needs a port, which is set thanks to the listen function.
})

const ioServer = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

const gameServiceSocket = Client(process.env.GAME_SERVICE_URL);
const gameNamespace = ioServer.of("/game");

const servicesNamespaces = {
    Game: {
        namespace: gameNamespace,
        socket: gameServiceSocket,
    }
};

Object.entries(servicesNamespaces).forEach(([serviceName, service]) => {
    const {namespace, socket} = service;

    namespace.on("connection", (clientSocket) => {
        clientSocket.onAny((eventName, ...args) => {
            socket.emit(eventName, {
                socketId: clientSocket.id,
                args
            });
        });

        clientSocket.on("disconnect", () => {
            socket.emit(`leave${serviceName}`, clientSocket.id);
        });
    });

    socket.onAny((eventName, data) => {
        if (data.room) {
            namespace.to(data.room).emit(eventName, data.eventData);
        }
    });

    socket.on("connect", () => {
        console.log(`✅ Gateway connected to ${serviceName} Service`);
    });

    socket.on("disconnect", () => {
        console.log(`❌ Gateway disconnected from ${serviceName} Service`);
    });
});

server.listen(8000, () => {
    console.log(`🌐 Gateway listening on ${process.env.GATEWAY_URL}`);
});