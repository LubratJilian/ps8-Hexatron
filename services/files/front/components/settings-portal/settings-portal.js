import {UserService} from "../../services/user-service.js";
import {PlayerKeys} from "../player-keys/player-keys.js";
import {PlayerColor} from "../player-color/player-color.js";
import {Component} from "../component/component.js";

export class SettingsPortal extends Component {
    constructor() {
        super();

        PlayerKeys.register();
        PlayerColor.register();

        this.settings = structuredClone(UserService.getInstance().user._parameters);

        this.boundKeyListener = this.keyListener.bind(this);
        this.boundCancelModification = this.cancelModification.bind(this);

        this.currentEventDetail = null;
        this.addEventListener("keyModificationAsked", (e) => this.eventHandler(e));
        this.addEventListener("colorModificationAsked", (e) => this.eventHandler(e));
        document.addEventListener("click", this.boundCancelModification);
    }

    async connectedCallback() {
        await super.connectedCallback();

        this.settings._keysPlayers.forEach((value, i) => {
            const playerKeys = document.createElement("player-keys");
            playerKeys.setAttribute("id", `player${i + 1}`);
            playerKeys.data = value;
            this.shadowRoot.getElementById("keys").appendChild(playerKeys);
        });

        this.settings._playersColors.forEach((color, i) => {
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
        if (this.settings._keysPlayers.some(row => row.includes(event.key.toUpperCase()) && this.settings._keysPlayers[index][this.currentEventDetail.index] !== event.key.toUpperCase())) {
            this.shadowRoot.getElementById("alreadyTakenKey").style.display = "flex";
            this.shadowRoot.getElementById(this.currentEventDetail.componentID).resetKey(this.currentEventDetail.index);
        } else {
            console.log("Touche pressée :", event.key);
            this.shadowRoot.getElementById(this.currentEventDetail.componentID).newKey(this.currentEventDetail.index, event.key.toUpperCase());
            this.settings._keysPlayers[index][this.currentEventDetail.index] = event.key.toUpperCase();
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
            }
            this.currentEventDetail = event.detail;
            document.addEventListener("keydown", this.boundKeyListener, {once: true});
        }
        if (event.type === "colorModificationAsked") {
            const index = event.detail.componentID.match(/\d+$/) - 1;
            if (event.color === this.settings._playersColors[(index + 1) % 2]) {
                this.shadowRoot.getElementById("alreadyTakenColor").style.display = "flex";
                this.shadowRoot.getElementById(`color${index + 1}`).color = this.settings._playersColors[index];
            } else {
                this.shadowRoot.getElementById("alreadyTakenColor").style.display = "none";
                this.settings._playersColors[index] = event.detail.color;
                this.shadowRoot.getElementById("validationPart").style.display = "flex";
            }
        }
    }

    async validate() {
        await UserService.getInstance().updateUser({_parameters: this.settings});
        this.shadowRoot.querySelector("#validationPart").style.display = "none";
    }

    cancel() {
        this.settings = structuredClone(UserService.getInstance().user._parameters);
        this.resetKeys();
        this.resetColors();
        this.shadowRoot.querySelector("#validationPart").style.display = "none";
    }

    disconnectedCallback() {
        super.disconnectedCallback && super.disconnectedCallback();
        document.removeEventListener("click", this.boundCancelModification);
        document.removeEventListener("keydown", this.boundKeyListener);
    }

    resetKeys() {
        this.settings._keysPlayers.forEach(
            (keys, index) => {
                this.shadowRoot.getElementById(`player${index + 1}`).data = keys;
            });
    }

    resetColors() {
        this.settings._playersColors.forEach(
            (color, index) => {
                this.shadowRoot.getElementById(`color${index + 1}`).color = color;
            });
    }
}