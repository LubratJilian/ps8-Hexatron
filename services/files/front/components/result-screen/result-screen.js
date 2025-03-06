import {Component} from "../component/component.js";
import {CustomButton} from "../custom-button/custom-button.js";

export class ResultScreen extends Component {
    constructor() {
        super();

        CustomButton.register();
    }

    async connectedCallback() {
        await super.connectedCallback();

        const backToMenu = this.shadowRoot.getElementById("back-to-menu");
        this.addAutoCleanListener(backToMenu, "click", () => window.location.href = "/");
    }
}