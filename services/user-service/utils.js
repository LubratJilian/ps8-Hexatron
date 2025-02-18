const {ObjectId} = require("mongodb");

class HttpError extends Error {
    constructor(status, message) {
        super(message);
        this.status = status;
    }
}

function convertToID(id) {
    return new ObjectId(id);
}

function convertToString(id) {
    return id.toHexString();
}

module.exports = {
    HttpError,
    convertToID,
    convertToString
};