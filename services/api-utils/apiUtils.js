const fs = require("fs");

function generateDocumentationAPI(path, data) {
    try {
        fs.writeFileSync(path, data, {flag: "wx"});
        console.log("File successfully created");
    } catch (err) {
        if (err.code === "EEXIST") {
            console.log("The file already exists");
        } else {
            throw err;
        }
    }
}

function readData(path) {
    try {
        return fs.readFileSync(path, "utf8");
    } catch (err) {
        if (err.code === "ENOENT") {
            console.log("File not found. Creating the file...");
            try {
                generateDocumentationAPI();
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