import {Component} from "../component/component.js";

export class ImageButton extends Component {
    constructor() {
        super();

        this.src = null;
        this.alt = "";
    }

    static get observedAttributes() {
        return ['src', 'alt'];
    }

    attributeChangedCallback(name, oldValue, newValue) {
        switch (name) {
            case "src":
                this.src = newValue;
                break;
            case "alt":
                this.alt = newValue;
                break;
        }

        this.update();
    }

    async connectedCallback() {
        await super.connectedCallback();
        this.checkSrc();
        this.update();
    }

    checkSrc() {
        if (!this.src)
            console.warn(
                `The <image-button> component has been initialized without the "src" attribute.`,
                this);
    }

    update() {
        const imgElement = this.shadowRoot.querySelector('img');

        if (imgElement) {
            imgElement.setAttribute('src', this.src);
            imgElement.setAttribute('alt', this.alt);
        }
    }
}