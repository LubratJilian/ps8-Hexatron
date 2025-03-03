import {GameBoard} from "../game-board/game-board.js";
import {GameHeader} from "../game-header/game-header.js";
import {GameService, GameStatus} from "../../services/game-service.js";
import {GameWaiting} from "../game-waiting/game-waiting.js";
import {ListenerComponent} from "../component/listener-component.js";

export class GameComponent extends ListenerComponent {
    constructor() {
        super();

        GameBoard.register();
        GameHeader.register();
        GameWaiting.register();
    }

    async connectedCallback() {
        await super.connectedCallback();

        this.hideLoader = () => {
            const loader = this.shadowRoot.getElementById("loader");
            const gameDiv = this.shadowRoot.getElementById("game");
            if (loader)
                loader.style.display = "none";
            if (gameDiv) {
                gameDiv.style.visibility = "visible";
                gameDiv.style.opacity = "1";
                gameDiv.style.transition = "opacity 0.5s ease-in-out";
            }
        };

        if (GameService.getInstance().isGameCreated())
            this.hideLoader();

        this.addEventListener(GameService, GameStatus.CREATED,
            () => this.hideLoader());
    }
}