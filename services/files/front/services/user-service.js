import {User} from "../js/User.js";
import {EventEmitter} from "../js/EventEmitter.js";

export const USER_EVENTS = Object.freeze({
    CONNECTION: "CONNECTION",
    LOGOUT: "LOGOUT"
});

export const USER_ACTIONS = Object.freeze({
    LOGIN: "login",
    REGISTER: "register",
    UPDATE_USERNAME: "editUsername",
    UPDATE_PASSWORD: "updatePassword",
    RESET_PASSWORD: "resetPassword",
    LOGOUT: "logout",
    DELETE: "delete"
});

const DEFAULT_PARAMS = {
    keysPlayers: [["A", "Q", "E", "D"], ["U", "J", "O", "L"]],
    playersColors: ["#ff0000", "#40ff00"]
};

export class UserService extends EventEmitter {
    static _instance = null;
    static ERROR_MESSAGES = {
        [USER_ACTIONS.LOGIN]: {
            400: "Invalid login credentials.",
            401: "Incorrect password or account does not exist.",
            500: "Unable to log in at the moment. Please try again later."
        },
        [USER_ACTIONS.REGISTER]: {
            409: "This username is already taken. Please choose a different one.",
            500: "Unable to register at the moment. Please try again later."
        },
        [USER_ACTIONS.UPDATE_USERNAME]: {
            409: "This username is already taken. Please choose a different one.",
            500: "Unable to change the username at the moment. Please try again later."
        },
        [USER_ACTIONS.UPDATE_PASSWORD]: {
            401: "The current password is incorrect. Please try again.",
            500: "Unable to update the password at the moment. Please try again later."
        },
        [USER_ACTIONS.RESET_PASSWORD]: {
            401: "The security answers provided are incorrect. Please try again.",
            404: "No account found with the provided username."
        },
        [USER_ACTIONS.DELETE]: {
            404: "The user account you are trying to delete does not exist.",
            500: "Unable to delete your account at the moment. Please try again later."
        },
        default: {
            400: "Something went wrong with your request. Please check your input and try again.",
            401: "You need to log in to perform this action.",
            403: "You do not have permission to perform this action.",
            404: "The resource you are looking for could not be found.",
            500: "We are experiencing some technical difficulties. Please try again later.",
            503: "Unable to connect to the server. Please check your internet connection and try again."
        }
    };

    constructor() {
        super();

        if (UserService._instance) return UserService._instance;

        this._user = JSON.parse(localStorage.getItem("user")) || new User("0", "Player 1", "assets/profile.svg", DEFAULT_PARAMS);
        this._accessToken = localStorage.getItem("accessToken") || null;
        this._refreshToken = localStorage.getItem("refreshToken") || null;
        this._connected = localStorage.getItem("connected") || false;

        if (!this._connected) {
            localStorage.setItem("user", JSON.stringify(this._user));
        }

        this._eventEmitter = new EventEmitter();
        UserService._instance = this;
    }

    get user() {
        return this._user;
    }

    static getInstance() {
        if (!UserService._instance) {
            UserService._instance = new UserService();
        }
        return UserService._instance;
    }

    isConnected() {
        return this._connected;
    }

    _getErrorMessage(status, action) {
        return UserService.ERROR_MESSAGES[action]?.[status] || UserService.ERROR_MESSAGES.default[status] || "An unknown error has occurred.";
    }

    async register(data) {
        console.log(this.user.parameters, data);
        data.parameters = this._user.parameters;
        return this._authenticate("api/user/register", data, USER_ACTIONS.REGISTER);
    }

    async login(data) {
        return this._authenticate("api/user/login", data, USER_ACTIONS.LOGIN);
    }

    _setUserData(data) {
        this._user = data.user;
        this._accessToken = data.accessToken;
        this._refreshToken = data.refreshToken;
        this._connected = true;
        this._saveToLocalStorage();
        this.emit(USER_EVENTS.CONNECTION);
    }

    async _authenticate(endpoint, data) {
        const response = await this._request("POST", endpoint, data);
        if (response.success) {
            this._setUserData(response.data);
            return {success: true, user: this._user};
        }
        return {success: false, error: this._getErrorMessage(response.status, USER_ACTIONS.LOGIN)};
    }

    async updateUser(newData) {
        if (this.isConnected()) {
            const response = await this._request("PATCH", `api/user/me`, newData);
            if (response.success) {
                const data = response.data;
                console.log(data.user);
                this._user = data.user;
                localStorage.setItem("user", JSON.stringify(this._user));
                return {success: true, newData: newData};
            }
            return {success: false, error: this._getErrorMessage(response.status, USER_ACTIONS.UPDATE_USERNAME)};
        } else {
            Object.entries(newData).forEach(([key, value]) => this._user[key] = value);
            localStorage.setItem("user", JSON.stringify(this._user));
        }
    }

    async updatePassword(curPassword, newPassword) {
        const response = await this._request("POST", "api/user/updatePassword", {
            oldPassword: curPassword,
            newPassword
        });
        if (response.success)
            return {success: true, message: "Password successfully modified"};

        return {success: false, error: this._getErrorMessage(response.status, USER_ACTIONS.UPDATE_PASSWORD)};
    }

    async logout() {
        await this._request("POST", "api/user/disconnect");
        this._reset();
        this.emit(USER_EVENTS.LOGOUT);
    }

    async delete() {
        const response = await this._request("DELETE", `api/user/me`);
        if (response.success) {
            this._reset();
            return {success: true, message: "User successfully deleted."};
        }

        return {success: false, error: this._getErrorMessage(response.status, USER_ACTIONS.DELETE)};
    }

    async resetPassword(data) {
        const response = await this._request("POST", "api/user/resetPassword", data);
        if (response.success)
            return {success: true, message: "Password successfully reset."};

        return {success: false, error: this._getErrorMessage(response.status, USER_ACTIONS.RESET_PASSWORD)};
    }

    async refreshAccessToken() {
        const response = await this._request("POST", "api/user/refreshToken", null, this._refreshToken);
        if (response) {
            this._accessToken = response.accessToken;
            localStorage.setItem("accessToken", this._accessToken);
        }
        return response;
    }

    async _request(method, endpoint, body = null, token = this._accessToken) {
        const headers = {"Content-Type": "application/json"};
        if (token)
            headers["Authorization"] = `Bearer ${token}`;

        const options = {
            method,
            headers,
            body: body ? JSON.stringify(body) : null
        };

        try {
            const response = await fetch(`${window.location}${endpoint}`, options);
            const data = await response.json().catch(() => null);
            if (response.status === 498) {
                await this.refreshAccessToken();
                return this._request(method, endpoint, body, this._accessToken);
            }

            if (!response.ok)
                return {success: false, status: response.status};

            return {success: true, data};
        } catch (error) {
            if (error.name === "TypeError" || error.message === "Failed to fetch")
                return {success: false, status: 503};

            return {success: false, status: 500};
        }
    }

    _saveToLocalStorage() {
        localStorage.setItem("user", JSON.stringify(this._user));
        localStorage.setItem("accessToken", this._accessToken);
        localStorage.setItem("refreshToken", this._refreshToken);
        localStorage.setItem("connected", this._connected);
    }

    _clearLocalStorage() {
        localStorage.removeItem("user");
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
        localStorage.removeItem("connected");
    }

    _reset() {
        this._user = null;
        this._accessToken = null;
        this._refreshToken = null;

        this._clearLocalStorage();
    }
}
