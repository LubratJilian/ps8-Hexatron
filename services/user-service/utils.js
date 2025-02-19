const {ObjectId} = require("mongodb");

const DATABASE_ERRORS = {
    USER_NOT_FOUND: "USER_NOT_FOUND",
    TOKEN_GENERATION_FAILED: "TOKEN_GENERATION_FAILED",
    TOKEN_NOT_FOUND: "TOKEN_NOT_FOUND",
    TOKEN_INSERT_FAILED: "TOKEN_INSERT_FAILED",
    INVALID_PASSWORD: "INVALID_PASSWORD",
    USER_UPDATE_FAILED: "USER_UPDATE_FAILED",
    NO_REFRESH_TOKEN: "NO_REFRESH_TOKEN",
    SECURITY_ANSWERS_MISMATCH: "SECURITY_ANSWERS_MISMATCH",
    USERNAME_ALREADY_EXISTS: "USERNAME_ALREADY_EXISTS",
    VALIDATION_FAILED: "VALIDATION_FAILED"
};

class HttpError extends Error {
    constructor(status, message) {
        super(message);
        this.status = status;
    }
}

function parseRequestPath(req) {
    const baseUrl = `http://${req.headers.host}`;
    const url = new URL(req.url, baseUrl);

    return url.pathname.split("/").filter(Boolean).slice(2);
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
    convertToString,
    DATABASE_ERRORS,
    parseRequestPath
};