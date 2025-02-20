export const USER_ACTIONS = Object.freeze({
    LOGIN: "login",
    REGISTER: "register",
    UPDATE_USERNAME: "editUsername",
    UPDATE_PASSWORD: "updatePassword",
    RESET_PASSWORD: "resetPassword",
    LOGOUT: "logout",
});

export class UserService {
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
        default: {
            400: "Invalid request.",
            401: "Unauthorized access.",
            403: "Forbidden action.",
            404: "Resource not found.",
            500: "Server error. Please try again later.",
            503: "Unable to connect to the server. Please check your internet connection and try again."
        }
    };


    constructor() {
        if (UserService._instance) return UserService._instance;

        this._user = JSON.parse(localStorage.getItem("user")) || null;
        this._accessToken = localStorage.getItem("accessToken") || null;
        this._refreshToken = localStorage.getItem("refreshToken") || null;

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
        return this.user !== null;
    }

    _getErrorMessage(status, action) {
        return UserService.ERROR_MESSAGES[action]?.[status] || UserService.ERROR_MESSAGES.default[status] || "An unknown error has occurred.";
    }

    async register(data) {
        data["parameters"] = " ";
        const response = await this._request("POST", "/api/user/register", data);
        if (response.success) {
            const data = response.data;
            this._user = data.user;
            this._accessToken = data.accessToken;
            this._refreshToken = data.refreshToken;

            this._saveToLocalStorage();
            return {success: true, user: data.user};
        }
        return {success: false, error: this._getErrorMessage(response.status, USER_ACTIONS.REGISTER)};
    }

    async login(data) {
        const response = await this._request("POST", "/api/user/login", data);
        if (response.success) {
            const data = response.data;
            this._user = data.user;
            this._accessToken = data.accessToken;
            this._refreshToken = data.refreshToken;
            this._saveToLocalStorage();
            return {success: true, user: data.user};
        }
        return {success: false, error: this._getErrorMessage(response.status, USER_ACTIONS.LOGIN)};
    }

    async updateUsername(newUsername) {
        const response = await this._request("PATCH", `/api/user/${this.user._id}`, {name: newUsername});
        if (response.success) {
            const data = response.data;
            this.user.name = data.user.name;
            localStorage.setItem("user", JSON.stringify(this._user));
            return {success: true, username: data.user.name};
        }
        return {
            success: false,
            error: this._getErrorMessage(response.status, USER_ACTIONS.UPDATE_USERNAME)
        };
    }

    async updatePassword(curPassword, newPassword) {
        const response = await this._request("POST", "/api/user/updatePassword", {
            oldPassword: curPassword,
            newPassword
        });
        if (response.success)
            return {success: true, message: "Password successfully modified"};

        return {
            success: false,
            error: this._getErrorMessage(response.status, USER_ACTIONS.UPDATE_PASSWORD)
        };
    }

    async logout() {
        await this._request("POST", "/api/user/disconnect");
        this._user = null;
        this._accessToken = null;
        this._refreshToken = null;

        this._clearLocalStorage();
    }

    async resetPassword(data) {
        const response = await this._request("POST", "/api/user/resetPassword", data);
        if (response.success)
            return {success: true, message: "Password successfully reset."};

        return {success: false, error: this._getErrorMessage(response.status, USER_ACTIONS.RESET_PASSWORD)};
    }

    async refreshAccessToken() {
        const response = await this._request("POST", "/api/user/refreshToken", null, this._refreshToken);
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
            const response = await fetch(`http://127.0.0.1:8000${endpoint}`, options);
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
    }

    _clearLocalStorage() {
        localStorage.removeItem("user");
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
    }
}
