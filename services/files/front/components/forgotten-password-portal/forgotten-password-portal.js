import {BaseAuth} from "../base-auth/base-auth.js";
import {UserService} from "../../services/user-service.js";

export class ForgottenPasswordPortal extends BaseAuth {
    async connectedCallback() {
        await super.connectedCallback();

        this._resetPasswordHandler = (data) => {
            if (data.success) {
                this.dispatchEvent(new CustomEvent("changeContent", {
                    bubbles: true,
                    composed: true,
                    detail: "profile",
                }));
            } else alert(data.error);
        };

        UserService.getInstance().on("resetPassword", this._resetPasswordHandler);
    }

    handleSubmit() {
        const data = this.getFormData();
        const username = data["username"];
        const password = data["password"];
        const answers = [
            data["security-question1"],
            data["security-question2"],
            data["security-question3"]
        ];

        UserService.getInstance().resetPassword({username, password, answers});
    }

    disconnectedCallback() {
        super.disconnectedCallback();
        UserService.getInstance().off("resetPassword", this._resetPasswordHandler);
    }
}