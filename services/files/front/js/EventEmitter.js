export class EventEmitter {
    constructor() {
        this._eventListeners = new Map();
    }

    /**
     * Registers a callback function for a specific event.
     * @param {string} event - The name of the event to listen to.
     * @param {Function} callback - The function to be executed when the event is emitted.
     * @returns {Symbol} A unique identifier for the callback, which can be used to remove it later.
     */
    on(event, callback) {
        if (!this._eventListeners.has(event)) {
            this._eventListeners.set(event, new Map());
        }
        const callbackId = Symbol();
        this._eventListeners.get(event).set(callbackId, callback);
        return callbackId;
    }

    /**
     * Removes a specific callback from an event.
     * @param {string} event - The name of the event.
     * @param {Symbol} callbackId - The unique identifier of the callback to be removed.
     */
    off(event, callbackId) {
        if (this._eventListeners.has(event))
            this._eventListeners.get(event).delete(callbackId);
    }

    /**
     * Emits an event, executing all registered callbacks with the provided arguments.
     * @param {string} event - The name of the event to emit.
     * @param {...any} args - Arguments to pass to the event listeners.
     * @private
     */
    emit(event, ...args) {
        if (this._eventListeners.has(event)) {
            for (const callback of this._eventListeners.get(event).values())
                callback(...args);
        }
    }
}
