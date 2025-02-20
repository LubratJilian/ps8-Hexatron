import {BaseAuth} from "../base-auth/base-auth.js";
import {UserService} from "../../services/user-service.js";
import {DRAWER_CONTENT} from "../drawer-menu/drawer-menu.js";

export class ForgottenPasswordPortal extends BaseAuth {
    _resetPasswordHandler(data) {
        if (data.success) {
            alert(data.message);
            this.dispatchEvent(new CustomEvent("changeContent", {
                bubbles: true,
                composed: true,
                detail: DRAWER_CONTENT.PROFILE,
            }));
        } else alert(data.error);
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

        UserService.getInstance().resetPassword({username, password, answers})
            .then((data) => this._resetPasswordHandler(data));
    }
}