const {
    deleteToken, addUser, generateToken, generateRefreshToken, checkPassword, updateUser, resetPassword,
    refreshAccessToken
} = require("./database");
const bcrypt = require("bcrypt");
const {HttpError, convertToString} = require("./utils");
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
};

exports.login = async (req, res) => {
    const credentials = req.body;
    let {_id, password, ...user} = await checkPassword(credentials.name, credentials.password, false);
    _id = convertToString(_id);
    const accessToken = generateToken(_id, true);
    const refreshToken = await generateRefreshToken(_id);

    res.writeHead(200, {"Content-Type": "application/json"});
    res.end(JSON.stringify({message: "User login", user: user, accessToken: accessToken, refreshToken: refreshToken}));
};

exports.update = async (req, res) => {
    const userID = getIDInRequest(req);
    const userData = req.body;
    await updateUser(userData, userID);
    res.writeHead(201, {"Content-Type": "application/json"});
    res.end(JSON.stringify({message: "User modified", user: userData}));
};

exports.updatePassword = async (req, res) => {
    const userID = getIDInRequest(req);
    const credential = req.body;

    await checkPassword(userID, credential.oldPassword, true);
    credential.newPassword = await hashPassword(credential.newPassword);
    await updateUser({password: credential.newPassword}, userID);

    res.writeHead(201, {"Content-Type": "application/json"});
    res.end(JSON.stringify({message: "Password Modify"}));
};

exports.resetPassword = async (req, res) => {
    const userID = getIDInRequest(req);
    let {answers, password} = req.body;
    password = await hashPassword(password);

    await resetPassword(userID, answers, password);

    res.writeHead(201, {"Content-Type": "application/json"});
};

exports.refreshToken = async (req, res) => {
    const token = await refreshAccessToken(getIDInRequest(req));

    res.writeHead(201, {"Content-Type": "application/json"});
    res.end(JSON.stringify({message: "New Token", accessToken: token}));
};

exports.disconnect = async (req, res) => {
    const userID = getIDInRequest(req);
    await deleteToken(userID);

    res.writeHead(201, {"Content-Type": "application/json"});
    res.end(JSON.stringify({message: "Disconnected successfully"}));
};