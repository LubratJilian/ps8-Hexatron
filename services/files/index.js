const http = require('http');
const fs = require("fs");
const fileQuery = require('./logic.js');

http.createServer(function (request, response) {
  if (request.url.split("/")[1] === "health") {
    response.writeHead(204);
    response.end();
  } else if (request.method === "POST") {
    let file = "";

    request.on("data", chunk => {
      file += chunk.toString();
    });

    request.on("end", () => {
      console.log(`File received: ${file}`);
      fs.writeFile("./front/swagger-ui-dist/doc.json", file, (error) => {
        if (error) {
          console.error(`Error creating the file: ${file}`, error);
          response.writeHead(400, {"Content-Type": "application/json"});
          response.end(JSON.stringify({error: "Error during file reception"}));
          } else {
            console.log("File created successfully!");
          response.writeHead(201, {"Content-Type": "application/json"});
          response.end(JSON.stringify({message: "File received"}));
          }
        });
    });
  } else {
    console.log(`Received query for a file: ${request.url}`);
    fileQuery.manage(request, response);
  }
// For the server to be listening to request, it needs a port, which is set thanks to the listen function.
}).listen(8001);