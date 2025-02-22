import {SubmitButton} from "../submit-button/submit-button.js";
import {BaseAuth} from "../base-auth/base-auth.js";
import {UserService} from "../../services/user-service.js";
import {DRAWER_CONTENT} from "../drawer-menu/drawer-menu.js";

export class RegisterPortal extends BaseAuth {
    constructor() {
        super();

        SubmitButton.register();
    }

    _registerHandler(data) {
        if (data.success) {
            this.dispatchEvent(new CustomEvent("changeContent", {
                bubbles: true,
                composed: true,
                detail: DRAWER_CONTENT.PROFILE,
            }));
        } else alert(data.error);
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

        UserService.getInstance().register({name, password, answers})
            .then((data) => this._registerHandler(data));
    }
}