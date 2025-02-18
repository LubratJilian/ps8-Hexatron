const {MongoClient, ObjectId} = require("mongodb");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const {convertToID, HttpError, convertToString} = require("./utils");

const userCollection = "users";
const refreshTokenCollection = "refreshTokens";
const dbName = "database";

const uri = process.env.URI;
const client = new MongoClient(uri);
const db = client.db(dbName);

async function getUserByID(userID) {
    const user = await db.collection(userCollection).findOne(
        {_id: convertToID(userID)},
        {projection: {password: 0}}
    );
    if (!user) {
        throw new HttpError(404, "User not found");
    }
    return user;
}

function generateToken(userID, access) {
    try {
        return jwt.sign(
            {userID},
            access ? process.env.ACCESS_TOKEN_SECRET : process.env.REFRESH_TOKEN_SECRET,
            {expiresIn: access ? "15m" : "7d"}
        );
    } catch (error) {
        throw new HttpError(500, "Token generation failed");
    }
}

async function generateRefreshToken(userID) {
    const token = generateToken(userID, false);
    const result = await db.collection(refreshTokenCollection).insertOne({userID, refreshToken: token});
    if (!result.acknowledged) {
        throw new HttpError(500, "Error adding token to database");
    }
    return token;
}

async function deleteToken(userID) {
    const result = await db.collection(refreshTokenCollection).deleteOne({userID});
    if (result.deletedCount === 0) {
        throw new HttpError(404, "Token not found");
    }
    return true;
}

async function addUser(newUser) {
    const result = await db.collection(userCollection).insertOne(newUser);
    return getUserByID(convertToString(result.insertedId));
}

async function getUserID(userName) {
    const user = await db.collection(userCollection).findOne({name: userName}, {projection: {_id: 1}});
    if (!user) {
        throw new HttpError(404, "User not found");
    }
    return convertToString(user._id);
}

async function deleteUserByID(userID) {
    const result = await db.collection(userCollection).deleteOne({_id: convertToID(userID)});
    if (result.deletedCount === 0) {
        throw new HttpError(404, "User not found");
    }
    return true;
}

async function checkPassword(credential, password, withID) {
    const user = withID ? await getUserByID(credential) : await db.collection(userCollection).findOne({name: credential});
    if (!user) {
        throw new HttpError(404, "User not found");
    }
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
        throw new HttpError(401, "Invalid password");
    }
    const {passwordUser, answersUser, ...res} = user;
    return res;
}

async function updateUser(newUserData, userID) {
    const modification = await db.collection(userCollection).updateOne(
        {_id: convertToID(userID)},
        {$set: newUserData}
    );
    if (modification.modifiedCount === 0) {
        throw new HttpError(400, "User update failed");
    }
    return true;
}

async function refreshAccessToken(userID) {
    const refreshTokenPresent = await db.collection(refreshTokenCollection).findOne({userID});
    if (!refreshTokenPresent) {
        throw new HttpError(403, "No refresh token found");
    }
    return generateToken(userID, true);
}

async function resetPassword(userID, answers, newPassword) {
    const user = await getUserByID(userID);
    if (!user.answers.every((el, i) => answers[i] === el)) {
        throw new HttpError(403, "Security answers do not match");
    }
    await updateUser({password: newPassword}, userID);
    return true;
}

module.exports = {
    deleteToken,
    addUser,
    generateToken,
    generateRefreshToken,
    checkPassword,
    updateUser,
    resetPassword,
    refreshAccessToken
};