import {Component} from "../component/component.js";

export class CustomButton extends Component {
    constructor() {
        super();
        this.locked = false;
    }

    static get observedAttributes() {
        return ["locked", "tooltip-message"];
    }

    async connectedCallback() {
        await super.connectedCallback();
        this.update();
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if (name === "locked")
            this.locked = newValue !== null;

        this.update();
    }

    update() {
        const button = this.shadowRoot.querySelector("button");
        const lockIcon = this.shadowRoot.querySelector(".lock-icon");
        const tooltip = this.shadowRoot.querySelector(".tooltip");

        if (button)
            button.disabled = this.locked;
        if (lockIcon)
            lockIcon.style.display = this.locked ? "inline" : "none";
        if (tooltip)
            tooltip.innerText = this.getAttribute("tooltip-message");
    }
}