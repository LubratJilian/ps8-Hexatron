import {SubmitButton} from "../submit-button/submit-button.js";
import {BaseAuth} from "../base-auth/base-auth.js";
import {UserService} from "../../services/user-service.js";
import {checkConfirmPassword} from "../../js/FormUtils.js";

export class RegisterPortal extends BaseAuth {
    constructor() {
        super();

        SubmitButton.register();
    }

    async connectedCallback() {
        await super.connectedCallback();

        this._registerHandler = (data) => {
            if (data.success) {
                this.dispatchEvent(new CustomEvent("changeContent", {
                    bubbles: true,
                    composed: true,
                    detail: "profile",
                }));
            } else alert(data.error);
        };

        UserService.getInstance().on("register", this._registerHandler);
    }

    checkValidity() {
        const requiredValidity = super.checkValidity();

        const confirm = this.shadowRoot.getElementById("confirm-password");
        const data = this.getFormData();
        const passwordValue = data["password"];
        const confirmPassword = data["confirm-password"];

        return checkConfirmPassword(confirm, passwordValue, confirmPassword) && requiredValidity;
    }

    handleSubmit() {
        const data = this.getFormData();
        const name = data["username"];
        const password = data["password"];
        const answers = [
            data["security-question1"],
            data["security-question2"],
            data["security-question3"]
        ];

        UserService.getInstance().register({name, password, answers});
    }

    disconnectedCallback() {
        super.disconnectedCallback();

        if (this._registerHandler)
            UserService.getInstance().off("register", this._registerHandler);
    }
}