export class UserService {
    static _instance = null;

    constructor() {
        if (UserService._instance) return UserService._instance;

        this._user = JSON.parse(localStorage.getItem("user")) || null;
        this._accessToken = localStorage.getItem("accessToken") || null;
        this._refreshToken = localStorage.getItem("refreshToken") || null;
        this._listeners = {};

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

    on(eventName, callback) {
        if (!this._listeners[eventName]) {
            this._listeners[eventName] = [];
        }
        this._listeners[eventName].push(callback);
    }

    off(eventName, callback) {
        if (this._listeners[eventName]) {
            this._listeners[eventName] = this._listeners[eventName].filter(cb => cb !== callback);
            if (this._listeners[eventName].length === 0) {
                delete this._listeners[eventName];
            }
        }
    }

    emit(eventName, data) {
        if (this._listeners[eventName]) {
            this._listeners[eventName].forEach(callback => callback(data));
        }
    }

    async register(data) {
        data["parameters"] = " ";
        const response = await this._request("POST", "/api/user/register", data);
        if (response) {
            this._user = response.user;
            this._accessToken = response.accessToken;
            this._refreshToken = response.refreshToken;

            this._saveToLocalStorage();
        }
        this.emit("register", response);
        return response;
    }

    async login(data) {
        const response = await this._request("POST", "/api/user/login", data);
        if (response) {
            this._user = response.user;
            this._accessToken = response.accessToken;
            this._refreshToken = response.refreshToken;
            this._saveToLocalStorage();
            this.emit("login", {success: true, user: response.user});
        } else {
            this.emit("login", {success: false, error: "The password is incorrect"});
        }
        return response;
    }

    async editUsername(newUsername) {
        const response = await this._request("PATCH", `/api/user/${this.user._id}`, {name: newUsername});
        if (response) {
            this._user.name = newUsername;
            localStorage.setItem("user", JSON.stringify(this._user));
        }
        const username = response.user.name;
        this.user.name = username;
        this.emit("editUsername", username);
        return response;
    }

    async editPassword(curPassword, newPassword) {
        const response = await this._request("POST", "/api/user/updatePassword", {
            oldPassword: curPassword,
            newPassword
        });
        if (response) {
            this.emit("editPassword", {success: true, message: "Password successfully modified"});
        } else {
            this.emit("editPassword", {success: false, error: "The password is incorrect"});
        }
        return response;
    }

    async logout() {
        const response = await this._request("POST", "/api/user/disconnect");
        this._user = null;
        this._accessToken = null;
        this._refreshToken = null;

        this._clearLocalStorage();

        this.emit("logout", response);
        return response;
    }

    async resetPassword(data) {
        const response = await this._request("POST", "/api/user/resetPassword", data);
        this.emit("resetPassword", response);
        return response;
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
        if (token) {
            headers["Authorization"] = `Bearer ${token}`;
        }

        const options = {
            method,
            headers,
            body: body ? JSON.stringify(body) : null
        };

        try {
            const response = await fetch(`http://127.0.0.1:8000${endpoint}`, options);
            if (response.status === 498) {
                await this.refreshAccessToken();
                return this._request(method, endpoint, body, this._accessToken);
            }
            const data = response.ok
                ? await response.json()
                : await response.text();
            this.emit("apiResponse", {endpoint, success: response.ok, data});
            return data;
        } catch (error) {
            console.error("API request error:", error);
            this.emit("apiError", {endpoint, error});
            return null;
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
