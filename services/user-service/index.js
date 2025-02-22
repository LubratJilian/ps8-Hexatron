const server = require("./route.js");

server.listen(8003, () => {
    console.log(`👤 User service listening on ${process.env.USER_SERVICE_URL}`);
});