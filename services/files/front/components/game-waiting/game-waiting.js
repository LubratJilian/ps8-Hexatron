import {Component} from "../component/component.js";
import {WaitingLoader} from "../waiting-loader/waiting-loader.js";

export class GameWaiting extends Component {
    constructor() {
        super();

        WaitingLoader.register();
    }
}