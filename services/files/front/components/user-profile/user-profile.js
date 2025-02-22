import {UserService} from "../../services/user-service.js";
import {FormInput} from "../form-input/form-input.js";
import {SubmitButton} from "../submit-button/submit-button.js";
import {ImageButton} from "../image-button/image-button.js";
import {BaseAuth} from "../base-auth/base-auth.js";
import {checkInputsValidity, getInputsData} from "../../js/FormUtils.js";

export class UserProfile extends BaseAuth {
    static SELECTORS = {
        PROFILE_PICTURE: "profile-picture",
        USERNAME: "username",
        LOGOUT: "logout",
        DELETE: "delete",
        USERNAME_INPUT: "username-input",
        EDIT_USERNAME: "edit-username",
        USERNAME_DIV: "username-div",
        PASSWORD_DIV: "password-div",
        PASSWORD_INPUTS_DIV: "password-inputs",
        PASSWORD: "password-display",
        EDIT_PASSWORD: "edit-password",
        CURRENT_PASSWORD_INPUT: "current-password",
        NEW_PASSWORD_INPUT: "password",
        CONFIRM_PASSWORD_INPUT: "confirm-password"
    };

    constructor() {
        super();

        FormInput.register();
        SubmitButton.register();
        ImageButton.register();

        this.editingUsername = false;
        this.editingPassword = false;
        this._elements = {};
    }

    async connectedCallback() {
        await super.connectedCallback();
        this._elements = this.initializeElements();
        this.setupEventListeners();
        this.updateUserData();
    }

    initializeElements() {
        const selectors = UserProfile.SELECTORS;
        return Object.fromEntries(
            Object.entries(selectors).map(([key, id]) => [key, this.shadowRoot.getElementById(id)])
        );
    }

    setupEventListeners() {
        this.addAutoCleanListener(this._elements.LOGOUT, "click", () => this.handleLogout());
        this.addAutoCleanListener(this._elements.EDIT_USERNAME, "click", () => this.toggleUsernameEdit());
        this.addAutoCleanListener(this._elements.EDIT_PASSWORD, "click", () => this.togglePasswordEdit());
        this.addAutoCleanListener(this._elements.DELETE, "click", () => this.handleDeletion());
    }

    async handleLogout() {
        await UserService.getInstance().logout();
        window.location.href = "/";
    }

    async handleDeletion() {
        const data = await UserService.getInstance().delete();
        if (data.success) {
            alert(data.message);
            window.location.href = "/";
        } else alert(data.error);
    }

    updateUserData() {
        if (!UserService.getInstance().user)
            return;

        if (this._elements.PROFILE_PICTURE && UserService.getInstance().user.profilePicturePath) {
            this._elements.PROFILE_PICTURE.src = UserService.getInstance().user.profilePicturePath;
            this._elements.PROFILE_PICTURE.onerror = () => console.warn("Error loading the profile picture");
        }

        if (this._elements.USERNAME && UserService.getInstance().user.name)
            this._elements.USERNAME.innerText = UserService.getInstance().user.name;
    }

    async toggleUsernameEdit() {
        if (!this.editingUsername) {
            this.showElement(this._elements.USERNAME_INPUT);
            this.hideElement(this._elements.USERNAME);
            this._elements.EDIT_USERNAME.setAttribute("src", "./assets/validate.svg");
            this._elements.USERNAME_INPUT.setAttribute("value", UserService.getInstance().user.name);
            this.editingUsername = true;
        } else {
            if (this.checkInputs(UserProfile.SELECTORS.USERNAME_DIV)) {
                const newUsername = this._elements.USERNAME_INPUT.shadowRoot.querySelector("input").value;
                const data = await UserService.getInstance().updateUsername(newUsername);
                this._handleUsernameChange(data);
            }
        }
    }

    _handleUsernameChange(data) {
        if (data.success) {
            this.hideElement(this._elements.USERNAME_INPUT);
            this.showElement(this._elements.USERNAME);
            this._elements.EDIT_USERNAME.setAttribute("src", "./assets/edit.svg");
            this.editingUsername = false;
            if (this._elements.USERNAME && data.username)
                this._elements.USERNAME.innerText = data.username;
        } else alert(data.error);
    }

    async togglePasswordEdit() {
        if (!this.editingPassword) {
            this.showElement(this._elements.PASSWORD_INPUTS_DIV);
            this.hideElement(this._elements.PASSWORD);
            this._elements.PASSWORD_DIV.classList.replace("inline", "password-edit");
            this._elements.EDIT_PASSWORD.setAttribute("src", "./assets/validate.svg");
            this.editingPassword = true;
        } else {
            if (this.checkInputs(UserProfile.SELECTORS.PASSWORD_DIV)) {
                const inputs = this.getInputs(`#${UserProfile.SELECTORS.PASSWORD_DIV} form-input`);
                const inputsData = getInputsData(inputs);
                const data = await UserService.getInstance().updatePassword(
                    inputsData["current-password"],
                    inputsData["confirm-password"]
                );
                this._handlePasswordChange(data, inputs);
            }
        }
    }

    _handlePasswordChange(data, inputs) {
        if (data.success) {
            inputs.forEach(formInput => formInput.shadowRoot.querySelector("input").value = "");
            this.hideElement(this._elements.PASSWORD_INPUTS_DIV);
            this.showElement(this._elements.PASSWORD);
            this._elements.PASSWORD_DIV.classList.replace("password-edit", "inline");
            this._elements.EDIT_PASSWORD.setAttribute("src", "./assets/edit.svg");
            this.editingPassword = false;
            alert(data.message);
        } else alert(data.error);

    }

    checkInputs(divId) {
        return checkInputsValidity(this.getInputs(`#${divId} form-input`));
    }

    getInputs(selector) {
        return this.shadowRoot.querySelectorAll(selector);
    }

    showElement(element) {
        if (element) element.style.display = "block";
    }

    hideElement(element) {
        if (element) element.style.display = "none";
    }
}