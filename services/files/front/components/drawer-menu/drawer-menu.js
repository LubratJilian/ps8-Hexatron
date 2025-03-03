import {Component} from "../component/component.js";
import {LoginPortal} from "../login-portal/login-portal.js";
import {UserService} from "../../services/user-service.js";
import {UserProfile} from "../user-profile/user-profile.js";
import {RegisterPortal} from "../register-portal/register-portal.js";
import {ForgottenPasswordPortal} from "../forgotten-password-portal/forgotten-password-portal.js";

export const DRAWER_CONTENT = Object.freeze({
    PROFILE: "profile",
    REGISTER: "register",
    FORGOT_PASSWORD: "forgottenPassword"
});

export class DrawerMenu extends Component {
    constructor() {
        super();

        this._oppened = false;
        LoginPortal.register();
        UserProfile.register();
        RegisterPortal.register();
        ForgottenPasswordPortal.register();
    }

    async connectedCallback() {
        await super.connectedCallback();

        this.addAutoCleanListener(window, "openDrawer", (event) => {
            if (this.loadContent(event.detail.type))
                this.nav();
        });

        this.addAutoCleanListener(window, "changeContent", (event) => {
            this.loadContent(event.detail);
        });

        this.addAutoCleanListener(
            this.shadowRoot.getElementById("close-btn"),
            "click",
            () => this.nav()
        );
    }

    loadContent(type) {
        let component;

        switch (type) {
            case DRAWER_CONTENT.PROFILE:
                component = (UserService.getInstance().isConnected()) ? "<user-profile></user-profile>" : "<login-portal></login-portal>";
                break;
            case DRAWER_CONTENT.REGISTER:
                component = "<register-portal></register-portal>";
                break;
            case DRAWER_CONTENT.FORGOT_PASSWORD:
                component = "<forgotten-password-portal></forgotten-password-portal>";
                break;
            default:
                console.warn("This type is not yet supported");
                return false;
        }

        this.shadowRoot.getElementById("content").innerHTML = component;
        return true;
    }

    nav() {
        const sidenav = this.shadowRoot.getElementById("mySidenav");
        const closeBtn = this.shadowRoot.getElementById("close-btn");

        if (this._oppened) {
            closeBtn.style.visibility = "hidden";
            sidenav.classList.remove("open");
            this.shadowRoot.getElementById("content").innerHTML = "";
        } else {
            closeBtn.style.visibility = "visible";
            sidenav.classList.add("open");
        }
        this._oppened = !this._oppened;
    }
}