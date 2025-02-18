import {UserService} from "../../services/user-service.js";
import {FormInput} from "../form-input/form-input.js";
import {SubmitButton} from "../submit-button/submit-button.js";
import {ImageButton} from "../image-button/image-button.js";
import {BaseAuth} from "../base-auth/base-auth.js";
import {checkConfirmPassword, checkInputsValidity, getInputsData} from "../../js/FormUtils.js";

export class UserProfile extends BaseAuth {
    constructor() {
        super();
        FormInput.register();
        SubmitButton.register();
        ImageButton.register();
        this.editingUsername = false;
        this.editingPassword = false;

        this.SELECTORS = {
            PROFILE_PICTURE: "profile-picture",
            USERNAME: "username",
            LOGOUT: "logout",
            USERNAME_INPUT: "username-input",
            EDIT_USERNAME: "edit-username",
            USERNAME_DIV: "username-div",
            PASSWORD_DIV: "password-div",
            PASSWORD_INPUTS_DIV: "password-inputs",
            PASSWORD: "password",
            EDIT_PASSWORD: "edit-password",
            CURRENT_PASSWORD_INPUT: "current-password-input",
            NEW_PASSWORD_INPUT: "new-password-input",
            CONFIRM_PASSWORD_INPUT: "confirm-password-input",
        };
    }

    async connectedCallback() {
        await super.connectedCallback();

        const elements = this.initializeElements();

        this.setupEventListeners(elements);
        this.updateUserData(elements);

        this._logoutHandler = () => window.location.href = "/";

        this._usernameChangedHandler = (username) => {
            if (elements.username && username) {
                elements.username.innerText = username;
            }
        };

        UserService.getInstance().on("logout", this._logoutHandler);
        UserService.getInstance().on("editUsername", this._usernameChangedHandler);
    }

    disconnectedCallback() {
        super.disconnectedCallback();

        if (this._usernameChangedHandler)
            UserService.getInstance().off("editUsername", this._usernameChangedHandler);
        if (this._logoutHandler)
            UserService.getInstance().off("logout", this._logoutHandler);
    }

    initializeElements() {
        return {
            profilePicture: this.shadowRoot.getElementById(this.SELECTORS.PROFILE_PICTURE),
            username: this.shadowRoot.getElementById(this.SELECTORS.USERNAME),
            logout: this.shadowRoot.getElementById(this.SELECTORS.LOGOUT),
            userNameInput: this.shadowRoot.getElementById(this.SELECTORS.USERNAME_INPUT),
            editUserName: this.shadowRoot.getElementById(this.SELECTORS.EDIT_USERNAME),
            passwordDiv: this.shadowRoot.getElementById(this.SELECTORS.PASSWORD_DIV),
            password: this.shadowRoot.getElementById(this.SELECTORS.PASSWORD),
            editPassword: this.shadowRoot.getElementById(this.SELECTORS.EDIT_PASSWORD),
            curPasswordInput: this.shadowRoot.getElementById(this.SELECTORS.CURRENT_PASSWORD_INPUT),
            newPasswordInput: this.shadowRoot.getElementById(this.SELECTORS.NEW_PASSWORD_INPUT),
            confirmPasswordInput: this.shadowRoot.getElementById(this.SELECTORS.CONFIRM_PASSWORD_INPUT),
            passwordInputsDiv: this.shadowRoot.getElementById(this.SELECTORS.PASSWORD_INPUTS_DIV)
        };
    }

    setupEventListeners(elements) {
        this.addAutoCleanListener(elements.logout, "click", () => UserService.getInstance().logout());

        this.addAutoCleanListener(elements.editUserName, "click", () =>
            this.toggleUsernameEdit(elements.userNameInput, elements.username, elements.editUserName)
        );

        this.addAutoCleanListener(elements.editPassword, "click", () =>
            this.togglePasswordEdit(
                elements.passwordInputsDiv,
                elements.passwordDiv,
                elements.password,
                elements.confirmPasswordInput,
                elements.editPassword
            )
        );
    }

    updateUserData(elements) {
        const user = UserService.getInstance().user;
        if (user) {
            if (elements.profilePicture && user.profilePicturePath) {
                elements.profilePicture.src = user.profilePicturePath;
                elements.profilePicture.onerror = () => console.warn("Error loading the profile picture");
            }
            if (elements.username && user.name) {
                elements.username.innerText = user.name;
            }
        }
    }

    checkInputs(divId) {
        const inputs = this.getInputs(`#${divId} form-input`);
        return checkInputsValidity(inputs);
    }

    getInputs(selector) {
        return this.shadowRoot.querySelectorAll(selector);
    }

    toggleUsernameEdit(input, display, button) {
        if (!this.editingUsername) {
            this.showElement(input);
            this.hideElement(display);
            button.setAttribute("src", "./assets/validate.svg");
            input.setAttribute("value", UserService.getInstance().user.name);
            this.editingUsername = true;
        } else {
            if (this.checkInputs(this.SELECTORS.USERNAME_DIV)) {
                this.hideElement(input);
                this.showElement(display);
                button.setAttribute("src", "./assets/edit.svg");
                this.editingUsername = false;
                UserService.getInstance().editUsername(input.shadowRoot.querySelector("input").value);
            }
        }
    }

    togglePasswordEdit(passwordInputsDiv, passwordDiv, password, confirmPasswordInput, button) {
        if (!this.editingPassword) {
            this.showElement(passwordInputsDiv);

            this.hideElement(password);
            passwordDiv.classList.replace("inline", "password-edit");
            button.setAttribute("src", "./assets/validate.svg");
            this.editingPassword = true;
        } else {
            if (this.checkInputs(this.SELECTORS.PASSWORD_DIV)) {
                const inputs = this.shadowRoot.querySelectorAll(`#${this.SELECTORS.PASSWORD_DIV} form-input`);
                const inputsData = getInputsData(inputs);
                if (checkConfirmPassword(confirmPasswordInput, inputsData["new-password-input"], inputsData["confirm-password-input"])) {
                    inputs.forEach(formInput => formInput.shadowRoot.querySelector("input").value = "");
                    this.hideElement(passwordInputsDiv);

                    this.showElement(password);
                    passwordDiv.classList.replace("password-edit", "inline");
                    button.setAttribute("src", "./assets/edit.svg");
                    this.editingPassword = false;
                    UserService.getInstance().editPassword(inputsData["current-password-input"], inputsData["confirm-password-input"]);
                }
            }
        }
    }

    showElement(element) {
        element.style.display = "block";
    }

    hideElement(element) {
        element.style.display = "none";
    }
}