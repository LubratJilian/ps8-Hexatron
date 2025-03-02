import {Component} from '../component/component.js';
import {CustomButton} from "../custom-button/custom-button.js";
import {GameService, GameStatus} from "../../services/game-service.js";

export class ModeSelector extends Component {
    constructor() {
        super();

        CustomButton.register();
        this._gameCreatedHandler = null;
    }

    async connectedCallback() {
        await super.connectedCallback();

        this._rankedButton = this.shadowRoot.querySelector(`custom-button[game-type="${GameType.RANKED}"]`);

        const buttons = this.shadowRoot.querySelectorAll("custom-button");
        buttons.forEach(button => {
            const gameType = Number(button.getAttribute("game-type"));

            if (gameType === GameType.RANKED && !UserService.getInstance().isConnected())
                this.lockRankedButton();

            const handler = () => {
                const gameType = Number(button.getAttribute("game-type"));
                GameService.getInstance().startGame(gameType, 9, 16, 3, 2);

                setTimeout(() => {
                    window.dispatchEvent(new CustomEvent("navigate", {
                        detail: {route: "/game"}
                    }));
                }, 200);
            };

            this.addAutoCleanListener(button, 'click', handler);
        });
    }

    lockRankedButton() {
        this._rankedButton.setAttribute("locked", "");
        this._rankedButton.setAttribute("tooltip-message", "You must be logged in to play Ranked mode.");
    }

    unLockRankedButton() {
        this._rankedButton.removeAttribute("locked");
        this._rankedButton.removeAttribute("tooltip-message");
    }
}