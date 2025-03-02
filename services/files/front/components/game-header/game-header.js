import {Component} from "../component/component.js";
import {convertRemToPixels, hexToRGB, resizeCanvas, rgbToHex, waitForElm} from "../../js/Utils.js";
import {GameService, GameStatus} from "../../services/game-service.js";
import {UserService} from "../../services/user-service.js";

export class GameHeader extends Component {
    constructor() {
        super();
        this._roundEndHandler = null;
    }

    async connectedCallback() {
        await super.connectedCallback();

        this.resizeCanvasFunction = () => {
            resizeCanvas.call(this, 0.2, 1, "header", () => this.draw(this));
        };

        this.resizeCanvasFunction();

        this.receiveData(GameService.getInstance().game.players);
        this.addAutoCleanListener(window, "resize", this.resizeCanvasFunction);

        this._roundEndHandler = (data) => {
            if (data.status === "winner") {
                const colorIndex = +(data.winner !== UserService.getInstance().user._id);
                this.fillCircle(data.round + 1, UserService.getInstance().user.parameters.playersColors[colorIndex]);
            } else this.fillCircle(data.round + 1, "#D3D3D3");
        };

        GameService.getInstance().on(GameStatus.ROUND_END, this._roundEndHandler);
    }

    disconnectedCallback() {
        super.disconnectedCallback();

        if (this._roundEndHandler)
            GameService.getInstance().off(GameStatus.ROUND_END, this._roundEndHandler);
    }

    calculateUtils() {
        const canvas = this.shadowRoot.getElementById("header");
        const context = canvas.getContext("2d");
        const width = canvas.clientWidth;
        const height = canvas.clientHeight;

        const pxSize = convertRemToPixels(1.5);
        context.font = pxSize + "px serif";
        const size = context.measureText("2").fontBoundingBoxAscent - context.measureText("2").fontBoundingBoxDescent;
        return [context, width, height, size];
    }

    drawCircle(n, color, fill) {
        const [context, width, height, size] = this.calculateUtils();
        context.fillStyle = color;
        context.beginPath();
        context.arc(n * width / 4, height / 2, size, 0, 2 * Math.PI, true);

        fill ? context.fill() : context.stroke();

        const backGroundRGB = hexToRGB(context.fillStyle);
        const luminosityBackground = (backGroundRGB[0] * 299 + backGroundRGB[1] * 587 + backGroundRGB[2] * 114) / 1000;
        context.fillStyle = rgbToHex([luminosityBackground < 128 ? 255 : 0, luminosityBackground < 128 ? 255 : 0, luminosityBackground < 128 ? 255 : 0]);

        const center = context.measureText(n).width;
        context.fillText(n, n * width / 4 - center / 2, height / 2 + size / 2);
    }

    draw(callingContext) {
        const [context, width, height, size] = callingContext.calculateUtils();
        for (let k = 1; k < 4; k++) {
            callingContext.drawCircle(k, "#fff", false);
            if (k !== 3) {
                context.beginPath();
                context.moveTo(k * width / 4 + size, height / 2);
                context.lineTo((k + 1) * width / 4 - size, height / 2);
                context.stroke();
            }
        }
    }

    fillCircle(n, color) {
        this.drawCircle(n, color, true);
    }

    async receiveData(players) {
        const ids = Object.keys(players);
        let n = 1;
        for (let k = 0; k < ids.length; k++) {
            n = UserService.getInstance().user._id === ids[k] ? 1 : 2;
            waitForElm(this, "name-player" + n).then((element) => {
                element.innerText = players[ids[k]]._name;
            });

            waitForElm(this, "pp-player" + n).then((element) => {
                if (element) {
                    element.src = "../../assets/profile.svg";
                }
            });
        }
    }
}
