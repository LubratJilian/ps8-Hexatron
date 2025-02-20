const {MongoClient} = require("mongodb");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const {convertToID, convertToString, DATABASE_ERRORS} = require("./utils");

const userCollection = "users";
const refreshTokenCollection = "refreshTokens";
const dbName = "database";
const uri = process.env.URI;
const client = new MongoClient(uri);
const db = client.db(dbName);

function handleMongoError(error) {
    switch (error.code) {
        case 11000:
            throw new Error(DATABASE_ERRORS.USERNAME_ALREADY_EXISTS);
        case 121:
            throw new Error(DATABASE_ERRORS.VALIDATION_FAILED);
        default:
            throw error;
    }
}

async function mongoOperation(operation) {
    try {
        return await operation();
    } catch (error) {
        handleMongoError(error);
    }
}

async function getUserByID(userID, includePassword = false) {
    const projection = includePassword ? {} : {password: 0};

    const user = await mongoOperation(() =>
        db.collection(userCollection).findOne(
            {_id: convertToID(userID)},
            {projection}
        )
    );
    if (!user)
        throw new Error(DATABASE_ERRORS.USER_NOT_FOUND);

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
        throw new Error(DATABASE_ERRORS.TOKEN_GENERATION_FAILED);
    }
}

async function generateRefreshToken(userID) {
    const token = generateToken(userID, false);
    const result = await mongoOperation(() =>
        db.collection(refreshTokenCollection).insertOne({userID, refreshToken: token})
    );
    if (!result.acknowledged)
        throw new Error(DATABASE_ERRORS.TOKEN_INSERT_FAILED);
    return token;
}

async function deleteToken(userID) {
    const result = await mongoOperation(() =>
        db.collection(refreshTokenCollection).deleteOne({userID})
    );
    if (result.deletedCount === 0)
        throw new Error(DATABASE_ERRORS.TOKEN_NOT_FOUND);
    return true;
}

async function addUser(newUser) {
    const result = await mongoOperation(() =>
        db.collection(userCollection).insertOne(newUser)
    );
    return getUserByID(convertToString(result.insertedId));
}

async function getUserID(userName) {
    const user = await mongoOperation(() =>
        db.collection(userCollection).findOne({name: userName}, {projection: {_id: 1}})
    );
    if (!user)
        throw new Error(DATABASE_ERRORS.USER_NOT_FOUND);
    return convertToString(user._id);
}

async function deleteUserByID(userID) {
    const result = await mongoOperation(() =>
        db.collection(userCollection).deleteOne({_id: convertToID(userID)})
    );
    if (result.deletedCount === 0)
        throw new Error(DATABASE_ERRORS.USER_NOT_FOUND);
    return true;
}

async function checkPassword(credential, enteredPwd, withID) {
    const user = withID
        ? await getUserByID(credential, true)
        : await mongoOperation(() => db.collection(userCollection).findOne({name: credential}));
    if (!user)
        throw new Error(DATABASE_ERRORS.USER_NOT_FOUND);

    const match = await bcrypt.compare(enteredPwd, user.password);
    if (!match)
        throw new Error(DATABASE_ERRORS.INVALID_PASSWORD);

    const {password, answers, ...res} = user;
    return res;
}

async function updateUser(newUserData, userID) {
    const modification = await mongoOperation(() =>
        db.collection(userCollection).updateOne(
            {_id: convertToID(userID)},
            {$set: newUserData}
        )
    );

    if (modification.matchedCount === 0)
        throw new Error(DATABASE_ERRORS.USER_NOT_FOUND);

    return true;
}

async function refreshAccessToken(userID) {
    const refreshTokenPresent = await mongoOperation(() =>
        db.collection(refreshTokenCollection).findOne({userID})
    );
    if (!refreshTokenPresent)
        throw new Error(DATABASE_ERRORS.TOKEN_NOT_FOUND);
    return generateToken(userID, true);
}

async function resetPassword(username, answers, newPassword) {
    const userID = await getUserID(username);
    const user = await getUserByID(userID);
    if (!user.answers.every((el, i) => answers[i] === el))
        throw new Error(DATABASE_ERRORS.SECURITY_ANSWERS_MISMATCH);

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
    refreshAccessToken,
};