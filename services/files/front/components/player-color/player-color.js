import {Component} from "../component/component.js";

export class PlayerColor extends Component {
    constructor() {
        super();

        this._color = "";
    }

    set color(color) {
        this._color = color;
        if (this.isConnected) {
            this.shadowRoot.getElementById("colorPicker").value = this._color;
        }
    }

    async connectedCallback() {
        await super.connectedCallback();
        this.shadowRoot.getElementById("colorPicker").value = this._color;
        this.shadowRoot.getElementById("colorPicker").addEventListener("change", this.modifyColor.bind(this), false);
    }

    modifyColor(event) {
        this.dispatchEvent(new CustomEvent("colorModificationAsked", {
            detail: {componentID: this.id, color: event.target.value},
            bubbles: true,
            composed: true
        }));
    }
}