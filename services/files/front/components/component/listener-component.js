import {EventEmitter} from "../../js/EventEmitter.js";
import {Component} from "./component.js";

export class ListenerComponent extends Component {
    /**
     * Creates an instance of ListenerComponent.
     * Initializes a map to store event listeners for different services.
     */
    constructor() {
        super();
        this._serviceListeners = new Map(); // Map<service, Map<eventName, listenerId>>
    }

    /**
     * Adds an event listener to a specific service.
     * @param {Object} service - The service that must extend EventEmitter.
     * @param {string} eventName - The name of the event to listen to.
     * @param {Function} callback - The function to execute when the event is triggered.
     * @returns {Symbol} A unique identifier for the listener.
     * @throws {Error} If the service does not extend EventEmitter or if the callback is not a function.
     */
    addEventListener(service, eventName, callback) {
        if (!(service.getInstance() instanceof EventEmitter))
            throw new Error("Service must extend EventEmitter");
        if (typeof callback !== "function")
            throw new Error("Callback must be a function");

        if (!this._serviceListeners.has(service))
            this._serviceListeners.set(service, new Map());

        const listenerId = service.getInstance().on(eventName, callback);
        this._serviceListeners.get(service).set(eventName, listenerId);
        return listenerId;
    }

    /**
     * Called when the component is disconnected.
     * Removes all event listeners attached to all services.
     */
    disconnectedCallback() {
        super.disconnectedCallback();

        for (const [service, listeners] of this._serviceListeners) {
            for (const [event, listenerId] of listeners) {
                service.getInstance().off(event, listenerId);
            }
            listeners.clear();
        }

        this._serviceListeners.clear();
    }
}