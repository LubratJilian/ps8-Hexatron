import {Component} from "../component/component.js";
import {LoginPortal} from "../login-portal/login-portal.js";
import {UserService} from "../../services/user-service.js";
import {UserProfile} from "../user-profile/user-profile.js";
import {RegisterPortal} from "../register-portal/register-portal.js";
import {ForgottenPasswordPortal} from "../forgotten-password-portal/forgotten-password-portal.js";
import {SettingsPortal} from "../settings-portal/settings-portal.js";

export const DRAWER_CONTENT = Object.freeze({
    PROFILE: "profile",
    REGISTER: "register",
    FORGOT_PASSWORD: "forgottenPassword",
    SETTINGS: "settings"
});

export class DrawerMenu extends Component {
    constructor() {
        super();

        this.previous = "";
        this._oppened = false;
        LoginPortal.register();
        UserProfile.register();
        RegisterPortal.register();
        ForgottenPasswordPortal.register();
        SettingsPortal.register();
    }

    async connectedCallback() {
        await super.connectedCallback();

        this.addAutoCleanListener(window, "openDrawer", (event) => {
            if (this.loadContent(event.detail.type))
                this.nav(event.detail.type);
        });

        this.addAutoCleanListener(window, "changeContent", (event) => {
            this.loadContent(event.detail);
        });

        this.addAutoCleanListener(
            this.shadowRoot.getElementById("close-btn"),
            "click",
            () => this.nav(this.previous)
        );

        this.addAutoCleanListener(document, "click", (event) => {
            console.log(event.composedPath(), event.composedPath().some(element => element === "drawer-menu" || element === "custom-nav"), this._oppened);
            if (!(event.composedPath().some(element => element.localName === "drawer-menu" || element.localName === "custom-nav")) && this._oppened) {
                this.nav(this.previous);
            }
        });
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
            case DRAWER_CONTENT.SETTINGS:
                component = "<settings-portal></settings-portal>";
                break;
            default:
                console.warn("This type is not yet supported");
                return false;
        }

        this.shadowRoot.getElementById("content").innerHTML = component;
        return true;
    }

    nav(type) {
        const sidenav = this.shadowRoot.getElementById("mySidenav");
        const closeBtn = this.shadowRoot.getElementById("close-btn");

        if (this._oppened && this.previous === type) {
            closeBtn.style.visibility = "hidden";
            sidenav.classList.remove("open");
            this.shadowRoot.getElementById("content").innerHTML = "";
            this._oppened = !this._oppened;

        } else {
            closeBtn.style.visibility = "visible";
            sidenav.classList.add("open");
            this._oppened = true;
        }
        this.previous = type;
    }
}