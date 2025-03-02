import {Component} from "../component/component.js";
import {convertRemToPixels} from "../../js/Utils.js";

export class PlayerKeys extends Component {
    constructor() {
        super();
        this._data = [];
    }

    set data(data) {
        this._data = data;
        if (this.isConnected) {
            this.generateGrid();
        }
    }

    async connectedCallback() {
        await super.connectedCallback();

        this.shadowRoot.querySelector("p").textContent += " " + this.getAttribute("id").match(/\d+$/);
        this.generateGrid();
    }

    modifyKey(index) {
        //TODO Patch bug modif, cancel, modif -> letter stay in the hexagon
        this.shadowRoot.getElementById(index).textContent = "_";
        this.dispatchEvent(new CustomEvent("keyModificationAsked", {
            detail: {componentID: this.id, index: index},
            bubbles: true,
            composed: true
        }));
    }

    generateGrid() {
        //TODO Find the good size for the text and do it responsive
        let grid = this.shadowRoot.querySelector("#grid>g");
        let size = 50;
        let verticalSpacing = (3 / 2) * size;
        let horizontalSpacing = (Math.sqrt(3) / 2) * size;
        const v = (1 / 2) * size;
        let keyIndex = 0;
        for (let i = -1; i <= 1; i++) {
            let range = 2 - Math.abs(i);
            for (let j = range; j >= -range; j--) {
                if (!(Math.abs(i % 2) !== Math.abs(j % 2))) {

                    const gElement = document.createElementNS("http://www.w3.org/2000/svg", "g");
                    gElement.setAttribute("transform", `translate(${j * horizontalSpacing}, ${i * verticalSpacing})`);

                    const hex = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
                    hex.setAttribute("points", `0,${size} ${horizontalSpacing},${v} ${horizontalSpacing},${-v} 0,${-size} ${-horizontalSpacing},${-v} ${-horizontalSpacing},${v}`);
                    if (i % 2 !== 0) {
                        hex.setAttribute("class", "editable");
                    }
                    gElement.appendChild(hex);

                    if (i % 2 !== 0) {
                        const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
                        text.textContent = this._data[keyIndex];
                        text.setAttribute("font-size", `${convertRemToPixels(0.3)}rem`);
                        text.setAttribute("id", keyIndex);
                        gElement.appendChild(text);

                        //gElement.setAttribute("id", `${keyIndex}`);
                        gElement.addEventListener("click", this.modifyKey.bind(this, keyIndex));


                        keyIndex++;
                    }
                    grid.appendChild(gElement);
                }
            }
        }
    }

    resetKey(index) {
        this.shadowRoot.getElementById(index).textContent = this._data[index];
    }

    newKey(index, key) {
        this.shadowRoot.getElementById(index).textContent = key;
    }
}