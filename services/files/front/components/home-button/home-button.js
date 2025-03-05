import {Component} from "../component/component.js";
import {ImageButton} from "../image-button/image-button.js";

export class HomeButton extends Component {
    constructor() {
        super();

        ImageButton.register();
        this.floating = true;
        this.display = true;
    }

    static get observedAttributes() {
        return ["floating", "display"];
    }

    attributeChangedCallback(name, oldValue, newValue) {
        switch (name) {
            case "floating":
                this.floating = newValue === "true";
                break;
            case "display":
                this.display = newValue === "true";
                break;
        }

        this.update();
    }

    async connectedCallback() {
        await super.connectedCallback();

        this.update();
        this.addAutoCleanListener(this.shadowRoot.querySelector("image-button"), "click", () => window.location.href = "/");
    }

    update() {
        if (!this.display)
            this.style.visibility = "hidden";
        else {
            if (!this.floating) {
                this.style.position = "static";
                this.style.display = "flex";
                this.style.alignItems = "center";
                this.style.margin = "0 0 0 20px";
            } else {
                this.style.position = "fixed";
                this.style.top = 0;
                this.style.left = 0;
                this.style.margin = "20px 0 0 20px";
            }
        }
    }
}