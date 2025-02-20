const http = require('http');
const fs = require("fs");
const fileQuery = require('./logic.js');

http.createServer(function (request, response) {
  console.log(request.url, request.method);
  if (request.url.split("/")[1] === "health") {
    response.writeHead(204);
    response.end();
  } else if (request.method === "POST") {
    let body = "";

    request.on("data", chunk => {
      body += chunk.toString();
    });

    request.on("end", () => {
      try {
        const data = JSON.parse(body);
        console.log(`Received a file: ${data}`, data.path, data.file);
        fs.writeFile(data.path, JSON.stringify(data.file), (err) => {
          if (err) {
            console.error(`Error creating the file: ${data}`, err);
          } else {
            console.log("File created successfully!");
          }
        });
        response.writeHead(200, {"Content-Type": "application/json"});
        response.end(JSON.stringify({message: "File received", received: data}));
      } catch (error) {
        console.log("error", error);
        response.writeHead(400, {"Content-Type": "application/json"});
        response.end(JSON.stringify({error: "Error during file reception"}));
      }
    });

  } else {
    console.log(`Received query for a file: ${request.url}`);
    fileQuery.manage(request, response);
  }
// For the server to be listening to request, it needs a port, which is set thanks to the listen function.
}).listen(8001);