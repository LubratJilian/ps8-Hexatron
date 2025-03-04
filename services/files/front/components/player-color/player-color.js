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
        this.addAutoCleanListener(this.shadowRoot.getElementById("colorPicker"), "change", this.modifyColor.bind(this));
    }

    modifyColor(event) {
        this._color = event.target.value;
        this.dispatchEvent(new CustomEvent("colorModificationAsked", {
            detail: {componentID: this.id, color: event.target.value},
            bubbles: true,
            composed: true
        }));
    }
}