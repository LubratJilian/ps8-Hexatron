import {Player} from "./Player.js";
import {defaultMovementsConfiguration} from "./GameUtils.js";
import {GameService} from "../../services/game-service.js";

export class LocalPlayer extends Player {
    constructor(id, name, keyConfiguration) {
        super(id, name);
        this._keys = keyConfiguration;
        this._movementsMapping = defaultMovementsConfiguration(keyConfiguration);
        this._currentResolve = null;

        this.setupListener();
    }

    setupListener() {
        window.addEventListener('keydown', (event) => {
            const key = event.key.toLowerCase();

            if (this._keys.includes(key) && GameService.getInstance().game?.id) {
                const move = this._movementsMapping[key];
                GameService.getInstance().nextMove(this.id, move);
            }
        });
    }
}