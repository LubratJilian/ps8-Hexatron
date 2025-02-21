const {
    deleteToken, addUser, generateToken, generateRefreshToken, checkPassword, updateUser, resetPassword,
    refreshAccessToken, deleteUserByID
} = require("./database");
const bcrypt = require("bcrypt");
const {HttpError, convertToString, DATABASE_ERRORS, parseRequestPath} = require("./utils");
const saltRounds = 10;

async function hashPassword(password) {
    try {
        const salt = await bcrypt.genSalt(saltRounds);
        return await bcrypt.hash(password, salt);
    } catch (error) {
        throw new HttpError(500, 'Internal server error while hashing password');
    }
}

function getIDInRequest(request) {
    const userId = request.headers["x-user-id"];
    if (userId) {
        return userId;
    } else {
        throw new HttpError(400, "Missing 'x-user-id' header in the request");
    }
}

exports.register = async (req, res) => {
    try {
        const userData = req.body;
        userData.password = await hashPassword(userData.password);
        const newUser = await addUser(userData);
        newUser._id = convertToString(newUser._id);
        const accessToken = generateToken(newUser._id, true);
        const refreshToken = await generateRefreshToken(newUser._id);

        res.writeHead(201, {"Content-Type": "application/json"});
        res.end(JSON.stringify({
            message: "User Created",
            user: newUser,
            accessToken: accessToken,
            refreshToken: refreshToken
        }));
    } catch (error) {
        if (error instanceof HttpError)
            throw error;

        if (error.message === DATABASE_ERRORS.USERNAME_ALREADY_EXISTS)
            throw new HttpError(409, "Username already exists");
        if (error.message === DATABASE_ERRORS.VALIDATION_FAILED)
            throw new HttpError(400, "Invalid user data format");

        throw new HttpError(500, "Internal server error during register");
    }
};

exports.login = async (req, res) => {
    try {
        const credentials = req.body;
        let {password, ...user} = await checkPassword(credentials.name, credentials.password, false);
        const id = convertToString(user._id);
        const accessToken = generateToken(id, true);
        const refreshToken = await generateRefreshToken(id);

        res.writeHead(200, {"Content-Type": "application/json"});
        res.end(JSON.stringify({
            message: "User login",
            user: user,
            accessToken: accessToken,
            refreshToken: refreshToken
        }));
    } catch (error) {
        if (error instanceof HttpError)
            throw error;

        if (error.message === DATABASE_ERRORS.USER_NOT_FOUND || error.message === DATABASE_ERRORS.INVALID_PASSWORD)
            throw new HttpError(401, "Invalid credentials");

        if (error.message === DATABASE_ERRORS.TOKEN_GENERATION_FAILED ||
            error.message === DATABASE_ERRORS.TOKEN_INSERT_FAILED)
            throw new HttpError(500, "Token generation failed");

        throw new HttpError(500, "Internal server error during login");
    }
};

exports.update = async (req, res) => {
    try {
        const userID = parseRequestPath(req)[0];
        const userData = req.body;
        await updateUser(userData, userID);
        res.writeHead(200, {"Content-Type": "application/json"});
        res.end(JSON.stringify({message: "User modified", user: userData}));
    } catch (error) {
        if (error instanceof HttpError)
            throw error;

        if (error.message === DATABASE_ERRORS.USERNAME_ALREADY_EXISTS)
            throw new HttpError(409, "Username already exists");
        if (error.message === DATABASE_ERRORS.USER_NOT_FOUND)
            throw new HttpError(404, "User not found");
        if (error.message === DATABASE_ERRORS.VALIDATION_FAILED)
            throw new HttpError(400, "Invalid data format");

        throw new HttpError(500, "Internal server error during update");
    }
};

exports.updatePassword = async (req, res) => {
    try {
        const userID = getIDInRequest(req);
        const credential = req.body;

        await checkPassword(userID, credential.oldPassword, true);
        credential.newPassword = await hashPassword(credential.newPassword);
        await updateUser({password: credential.newPassword}, userID);

        res.writeHead(200, {"Content-Type": "application/json"});
        res.end(JSON.stringify({message: "Password Modified"}));
    } catch (error) {
        if (error instanceof HttpError)
            throw error;

        if (error.message === DATABASE_ERRORS.INVALID_PASSWORD)
            throw new HttpError(401, "Current password is incorrect");
        if (error.message === DATABASE_ERRORS.USER_NOT_FOUND)
            throw new HttpError(404, "User not found");
        if (error.message === DATABASE_ERRORS.USER_UPDATE_FAILED)
            throw new HttpError(500, "Password update failed");
        if (error.message === DATABASE_ERRORS.VALIDATION_FAILED)
            throw new HttpError(400, "Invalid password format");

        throw new HttpError(500, "Internal server error during password update");
    }
};

exports.resetPassword = async (req, res) => {
    try {
        let {username, answers, password} = req.body;
        password = await hashPassword(password);

        await resetPassword(username, answers, password);
        res.writeHead(201, {"Content-Type": "application/json"});
        res.end(JSON.stringify({message: "Password Modified"}));
    } catch (error) {
        if (error instanceof HttpError)
            throw error;

        if (error.message === DATABASE_ERRORS.SECURITY_ANSWERS_MISMATCH)
            throw new HttpError(401, "Security answers do not match");
        if (error.message === DATABASE_ERRORS.USER_NOT_FOUND)
            throw new HttpError(404, "User not found");

        throw new HttpError(500, "Internal server error during password reset");
    }
};

exports.refreshToken = async (req, res) => {
    try {
        const token = await refreshAccessToken(getIDInRequest(req));

        res.writeHead(200, {"Content-Type": "application/json"});
        res.end(JSON.stringify({message: "New Token", accessToken: token}));
    } catch (error) {
        if (error instanceof HttpError)
            throw error;

        if (error.message === DATABASE_ERRORS.TOKEN_NOT_FOUND)
            throw new HttpError(401, "No refresh token found. Please login again");
        if (error.message === DATABASE_ERRORS.TOKEN_GENERATION_FAILED)
            throw new HttpError(500, "Failed to generate new access token");

        throw new HttpError(500, "Internal server error during token refresh");
    }
};

exports.disconnect = async (req, res) => {
    try {
        const userID = getIDInRequest(req);
        await deleteToken(userID);

        res.writeHead(204, {"Content-Type": "application/json"});
        res.end();
    } catch (error) {
        if (error instanceof HttpError)
            throw error;
        if (error.message === DATABASE_ERRORS.TOKEN_NOT_FOUND)
            throw new HttpError(404, "User was not logged in or already logged out");
        throw new HttpError(500, "Internal server error during logout");
    }
};

exports.delete = async (req, res) => {
    try {
        const userID = parseRequestPath(req)[0];
        await deleteUserByID(userID);

        res.writeHead(204, {"Content-Type": "application/json"});
        res.end();
    } catch (error) {
        if (error.message === DATABASE_ERRORS.USER_NOT_FOUND)
            throw new HttpError(404, "User not found");

        throw new HttpError(500, "Internal server error during user deletion");
    }
};