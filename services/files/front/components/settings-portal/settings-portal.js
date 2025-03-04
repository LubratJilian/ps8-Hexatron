import {UserService} from "../../services/user-service.js";
import {PlayerKeys} from "../player-keys/player-keys.js";
import {PlayerColor} from "../player-color/player-color.js";
import {Component} from "../component/component.js";

export class SettingsPortal extends Component {
    constructor() {
        super();

        PlayerKeys.register();
        PlayerColor.register();

        this.settings = structuredClone(UserService.getInstance().user.parameters);

        this.boundKeyListener = this.keyListener.bind(this);
        this.boundCancelModification = this.cancelModification.bind(this);

        this.currentEventDetail = null;
        this.addEventListener("keyModificationAsked", (e) => this.eventHandler(e));
        this.addEventListener("colorModificationAsked", (e) => this.eventHandler(e));
        this.addAutoCleanListener(document, "click", this.boundCancelModification);
    }

    async connectedCallback() {
        await super.connectedCallback();

        this.settings.keysPlayers.forEach((value, i) => {
            const playerKeys = document.createElement("player-keys");
            playerKeys.setAttribute("id", `player${i + 1}`);
            playerKeys.data = value;
            this.shadowRoot.getElementById("keys").appendChild(playerKeys);
        });

        this.settings.playersColors.forEach((color, i) => {
            const playerColor = document.createElement("player-color");
            playerColor.setAttribute("id", `color${i + 1}`);
            playerColor.color = color;
            this.shadowRoot.getElementById("colors").appendChild(playerColor);
        });

        this.addAutoCleanListener(this.shadowRoot.querySelector("#validate"), "click", async () => await this.validate());
        this.addAutoCleanListener(this.shadowRoot.querySelector("#cancel"), "click", () => this.cancel());
    }

    keyListener(event) {
        const index = this.currentEventDetail.componentID.match(/\d+$/) - 1;
        this.shadowRoot.getElementById("newKey").style.display = "none";
        if (this.settings.keysPlayers[index][this.currentEventDetail.index] === event.key.toUpperCase()) {
            this.shadowRoot.getElementById(this.currentEventDetail.componentID).resetKey(this.currentEventDetail.index);
            this.currentEventDetail = null;
            return;
        } else if (this.settings.keysPlayers.some(row => row.includes(event.key.toUpperCase()))) {
            this.shadowRoot.getElementById("alreadyTakenKey").style.display = "flex";
            this.shadowRoot.getElementById(this.currentEventDetail.componentID).resetKey(this.currentEventDetail.index);
        } else {
            this.shadowRoot.getElementById(this.currentEventDetail.componentID).newKey(this.currentEventDetail.index, event.key.toUpperCase());
            this.settings.keysPlayers[index][this.currentEventDetail.index] = event.key.toUpperCase();
            this.shadowRoot.getElementById("validationPart").style.display = "flex";
        }
        this.currentEventDetail = null;
    };

    cancelModification(event) {
        event.stopImmediatePropagation();
        if (this.currentEventDetail && event.composedPath()[0] && event.composedPath()[0].nodeName !== "polygon") {
            this.shadowRoot.getElementById("newKey").style.display = "none";
            this.shadowRoot.getElementById("alreadyTakenKey").style.display = "none";
            this.shadowRoot.getElementById(this.currentEventDetail.componentID).resetKey(this.currentEventDetail.index);
            document.removeEventListener("keydown", this.boundKeyListener);
            this.currentEventDetail = null;
        }
    }

    eventHandler(event) {
        event.preventDefault();
        event.stopImmediatePropagation();
        if (event.type === "keyModificationAsked") {
            this.shadowRoot.getElementById("alreadyTakenKey").style.display = "none";
            this.shadowRoot.getElementById("newKey").style.display = "flex";
            if (this.currentEventDetail) {
                this.shadowRoot.getElementById(this.currentEventDetail.componentID).resetKey(this.currentEventDetail.index);
                document.removeEventListener("keydown", this.boundKeyListener);
                if (Object.entries(event.detail).every(([key, value]) => this.currentEventDetail[key] === value)) {
                    this.currentEventDetail = null;
                    this.shadowRoot.getElementById("newKey").style.display = "none";
                    return;
                }
            }
            this.currentEventDetail = event.detail;
            this.addAutoCleanListener(document, "keydown", this.boundKeyListener, true);
        }
        if (event.type === "colorModificationAsked") {
            const index = event.detail.componentID.match(/\d+$/) - 1;
            if (event.detail.color === this.settings.playersColors[(index + 1) % 2]) {
                this.shadowRoot.getElementById("alreadyTakenColor").style.display = "flex";
                this.shadowRoot.getElementById(`color${index + 1}`).color = this.settings.playersColors[index];
            } else {
                this.shadowRoot.getElementById("alreadyTakenColor").style.display = "none";
                this.settings.playersColors[index] = event.detail.color;
                this.shadowRoot.getElementById("validationPart").style.display = "flex";
            }
        }
    }

    async validate() {
        await UserService.getInstance().updateUser({parameters: this.settings});
        this.shadowRoot.querySelector("#validationPart").style.display = "none";
    }

    cancel() {
        this.settings = structuredClone(UserService.getInstance().user.parameters);
        this.resetKeys();
        this.resetColors();
        this.shadowRoot.querySelector("#validationPart").style.display = "none";
    }

    disconnectedCallback() {
        super.disconnectedCallback && super.disconnectedCallback();
    }

    resetKeys() {
        this.shadowRoot.querySelectorAll("player-keys").forEach((child, index) => {
            child.resetKeys(this.settings.keysPlayers[index]);
        });
    }

    resetColors() {
        this.settings.playersColors.forEach(
            (color, index) => {
                this.shadowRoot.getElementById(`color${index + 1}`).color = color;
            });
    }
}