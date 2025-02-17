const {MongoClient, ObjectId} = require("mongodb");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const http = require("http");

const uri = process.env.URI;
const client = new MongoClient(uri);
console.log("Connected to the Database with URI ", uri);
const dbName = process.env.DB_NAME;
const db = client.db(dbName);
const userCollection = "users";
const refreshTokenCollection = "refreshTokens";
const saltRounds = 10;

try {
    db.dropCollection("refreshTokens").then();
} catch (error) {
    console.error(error);
}

function getIDInRequest(request) {
    const userId = request.headers["x-user-id"];
    if (userId) {
        return userId;
    } else {
        throw CustomError(-5, "No ID in the request");
    }
}

http.createServer(function (request, response) {
    if (request.method === "OPTIONS") {
        response.end();
        return;
    }
    let apiCall = request.url.split("/").filter(function (elem) {
        return elem !== "..";
    });
    if (apiCall[1] === "health") {
        response.writeHead(204);
        response.end();
        return;
    }
    let body = "";
    if (request.method === "POST") {
        request.on("data", chunk => {
            body += chunk.toString();
        });
        switch (apiCall[3].split("?")[0]) {
            case "register":
                request.on("end", async () => {
                    try {
                        const userData = JSON.parse(body);
                        const newUser = await addUser(userData);
                        newUser._id = convertToString(newUser._id);
                        const accessToken = generateToken(newUser._id, true);
                        const refreshToken = await generateRefreshToken(newUser._id);

                        response.writeHead(201, {"Content-Type": "application/json"});
                        response.end(JSON.stringify({
                            message: "User Created",
                            user: newUser,
                            accessToken: accessToken,
                            refreshToken: refreshToken
                        }));

                    } catch (error) {
                        catchErrors(error, response);
                    }

                });
                break;
            case "login":
                request.on("end", async () => {
                    try {
                        const credentials = JSON.parse(body);
                        let {_id, password, ...user} = await checkPassword(credentials.name, credentials.password, false);
                        _id = convertToString(_id);
                        const accessToken = generateToken(_id, true);
                        const refreshToken = await generateRefreshToken(_id);

                        response.writeHead(200, {"Content-Type": "application/json"});
                        response.end(JSON.stringify({message: "User login", user: user, accessToken: accessToken, refreshToken: refreshToken}));
                    } catch (error) {
                        catchErrors(error, response);
                    }
                });
                break;
            case "modify":
                request.on("end", async () => {
                    try {
                        const userID = getIDInRequest(request);
                        const userData = JSON.parse(body);
                        await modifyUser(userData, userID);
                        response.writeHead(201, {"Content-Type": "application/json"});
                        response.end(JSON.stringify({message: "User modified", user: userData}));

                    } catch (error) {
                        catchErrors(error, response);
                    }
                });
                break;
            case "modifyPassword":
                request.on("end", async () => {
                    try {
                        const userID = getIDInRequest(request);
                        const credential = JSON.parse(body);

                        await checkPassword(userID, credential.oldPassword, true);
                        credential.newPassword = await hashPassword(credential.newPassword);
                        await modifyUser({password: credential.newPassword}, userID);

                        response.writeHead(201, {"Content-Type": "application/json"});
                        response.end(JSON.stringify({message: "Password Modify"}));
                    } catch (error) {
                        catchErrors(error, response);
                    }
                });
                break;
            case "resetPassword":
                request.on("end", async () => {
                    try {
                        const userID = getIDInRequest(request);
                        const {answers, password} = JSON.parse(body);

                        await resetPassword(userID, answers, password);

                        response.writeHead(201, {"Content-Type": "application/json"});
                        response.end();
                    } catch (error) {
                        catchErrors(error);
                    }
                });
                break;
            case "refreshToken":
                request.on("end", async () => {
                    try {
                        const token = await refreshAccessToken(getIDInRequest(request));

                        response.writeHead(201, {"Content-Type": "application/json"});
                        response.end(JSON.stringify({message: "New Token", accessToken: token}));
                    } catch (error) {
                        catchErrors(error, response);
                    }
                });
                break;
            case "disconnect":
                request.on("end", async () => {
                    try {
                        const userID = getIDInRequest(request);
                        await disconnect(userID);

                        response.writeHead(201, {"Content-Type": "application/json"});
                        response.end();
                    } catch (error) {
                        catchErrors(error);
                    }
                });
                break;
            default:
                response.writeHead(500, {"Content-Type": "application/json"});
                response.end();
        }
    }
}).listen(8003);

class CustomError extends Error {
    constructor(code, message) {
        super(message);
        this.code = code;
    }
}

function generateToken(userID, access) {
    try {
        if (access) {
            return jwt.sign({userID: userID}, process.env.ACCESS_TOKEN_SECRET, {expiresIn: "15m"});
        }
        return jwt.sign({userID: userID}, process.env.REFRESH_TOKEN_SECRET, {expiresIn: "7d"});
    } catch (error) {
        throw new CustomError(-1, error);
    }
}

async function generateRefreshToken(userID) {
    try {
        const token = generateToken(userID, false);
        return db.collection(refreshTokenCollection).insertOne({"userID": userID, "refreshToken": token}).then(result => {
            if (!result.acknowledged) {
                throw new CustomError(-2, "Error adding the token to the database");
            }
            return token;
        });
    } catch (error) {
        throw error;
    }
}

async function hashPassword(password) {
    try {
        const salt = await bcrypt.genSalt(saltRounds);
        return await bcrypt.hash(password, salt);
    } catch (error) {
        throw error;
    }
}

async function addUser(newUser) {
    try {
        newUser.password = await hashPassword(newUser.password);
        const result = await db.collection(userCollection).insertOne(newUser);
        const user = await getUserByID(convertToString(result.insertedId));
        if (!user) {
            throw new CustomError(-4, "User not found in the database after insertion");
        }
        return user;
    } catch (error) {
        throw error;
    }
}

async function getUserID(userName) {
    try {
        const userID = await db.collection(userCollection).findOne({name: userName}, {projection: {_id: 1}});
        if (!userID) {
            return null;
        }
        return convertToString(userID._id);
    } catch (error) {
        console.error(`Error while trying to find the user '${userName}': `, error.message);
        return null;
    }
}

async function getUserByID(userID) {
    try {
        const user = await db.collection(userCollection).findOne({_id: convertToID(userID)}, {projection: {password: 0}});
        if (!user) {
            throw new CustomError(-4, "User not found in the database");
        }
        return user;
    } catch (error) {
        throw error;
    }
}

async function deleteUserByID(userID) {
    try {
        const result = await db.collection(userCollection).deleteOne({_id: convertToID(userID)});
        if (result.deletedCount === 1) {
            console.log("Successfully deleted one document.");
        } else {
            console.log(`No user matched the id: '${userID}'. Deleted 0 user.`);
        }
    } catch (error) {
        console.error(`Error while trying to delete the user '${userID}': `, error.message);
        return null;
    }
}

async function checkPassword(credential, password, withID) {
    try {
        let user;
        if (withID) {
            user = await db.collection(userCollection).findOne({_id: convertToID(credential)});
        } else {
            user = await db.collection(userCollection).findOne({name: credential});
        }
        if (!user) {
            throw new CustomError(-4, "User not found in the database to check the password");
        }
        const match = await bcrypt.compare(password, user.password);
        if (!match) {
            throw new CustomError(-9, "Password doesn't match");
        }
        const {passwordUser, answersUser, ...res} = user;
        return res;
    } catch (error) {
        throw error;
    }
}

async function modifyUser(newUserData, userID) {
    try {
        const modification = await db.collection(userCollection).updateOne({_id: convertToID(userID)}, {$set: newUserData});
        if (modification.modifiedCount !== 1) {
            throw new CustomError(-6, "Problem during the modification");
        }
        return true;
    } catch (error) {
        throw error;
    }
}

async function refreshAccessToken(userID) {
    try {
        const refreshTokenPresent = db.collection(refreshTokenCollection).findOne({userID: userID});
        if (!refreshTokenPresent) {
            throw new CustomError(-7, "No refresh token for the user");
        }
        return generateToken(userID, true);
    } catch (error) {
        throw error;
    }
}

async function resetPassword(userID, answers, newPassword) {
    try {
        let result = await db.collection(userCollection).findOne({_id: convertToID(userID)}, {projection: {answers: 1}});
        if (!result) {
            throw new CustomError(-4, "User not found in the database to reset the password");
        }
        if (result.answers.every((el, i) => answers[i] === el)) {
            let password = await hashPassword(newPassword);
            await modifyUser({password: password}, userID);
            return true;
        }
        throw new CustomError(-3, "Answers doesn’t match");
    } catch (error) {
        throw error;
    }

}

async function disconnect(userID) {
    try {
        let result = await db.collection(refreshTokenCollection).deleteOne({userID: userID});
        if (result.deletedCount === 1) {
            return true;
        } else {
            throw new CustomError(-8, "Error in deletion of the token");
        }
    } catch (error) {
        throw error;
    }
}

function convertToID(id) {
    return new ObjectId(id);
}

function convertToString(id) {
    return id.toHexString();
}

function catchErrors(error, response) {
    switch (error.code) {
        case 121:
            response.writeHead(400, {"Content-Type": "application/json"});
            response.end(JSON.stringify({error: "Data validation error"}));
            break;
        case 11000:
            response.writeHead(409, {"Content-Type": "application/json"});
            response.end(JSON.stringify({error: "This name already exist"}));
            break;
        case -1:
            response.writeHead(500, {"Content-Type": "application/json"});
            response.end(JSON.stringify({error: "Token generation error"}));
            break;
        case -2:
            response.writeHead(500, {"Content-Type": "application/json"});
            response.end(JSON.stringify({error: error.message}));
            break;
        case -3:
            response.writeHead(400, {"Content-Type": "application/json"});
            response.end(JSON.stringify({error: "Answers don't match"}));
            break;
        case -4:
            response.writeHead(404, {"Content-Type": "application/json"});
            response.end(JSON.stringify({error: "User not found in the database"}));
            break;
        case -5:
            response.writeHead(500, {"Content-Type": "application/json"});
            response.end(JSON.stringify({error: "No ID in the request "}));
            break;
        case -6:
            response.writeHead(500, {"Content-Type": "application/json"});
            response.end(JSON.stringify({error: "Problem during user modification"}));
            break;
        case -7:
            response.writeHead(404, {"Content-Type": "application/json"});
            response.end(JSON.stringify({error: "No refresh token associated the user"}));
            break;
        case -8:
            response.writeHead(500, {"Content-Type": "application/json"});
            response.end(JSON.stringify({error: "Error in token deletion"}));
            break;
        case -9:
            response.writeHead(500, {"Content-Type": "application/json"});
            response.end(JSON.stringify({error: "Password doesn't match"}));
            break;
        default:
            response.writeHead(500, {"Content-Type": "application/json"});
            response.end(JSON.stringify({error: error.message}));
    }
}

process.on("SIGINT", async () => {
    await client.close();
    console.log("MongoDB connection closed");
    process.exit(0);
});