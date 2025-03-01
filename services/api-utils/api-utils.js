const fs = require("fs");
const swaggerJsdoc = require("swagger-jsdoc");

function generateDocumentationAPI(path, options) {
    try {
        fs.writeFileSync(path, JSON.stringify(swaggerJsdoc(options)), {flag: "wx"});
        console.log("File successfully created");
    } catch (err) {
        if (err.code === "EEXIST") {
            console.log("The file already exists");
        } else {
            throw err;
        }
    }
}

function readData(path, options) {
    try {
        return fs.readFileSync(path, "utf8");
    } catch (err) {
        if (err.code === "ENOENT") {
            console.log("File not found. Creating the file...");
            try {
                generateDocumentationAPI(path, options);
                return readData(path);
            } catch (error) {
                throw error;
            }
        } else {
            throw err;
        }
    }
}

module.exports = {generateDocumentationAPI, readData};