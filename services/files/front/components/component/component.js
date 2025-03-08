export class Component extends HTMLElement {
    constructor() {
        super();

        this._listeners = new Set();
        this.attachShadow({ mode: 'open' });
    }

    static get elementName() {
        return this.name
            .replace(/([A-Z])/g, (match, letter, offset) =>
                offset > 0 ? `-${letter}` : letter
            )
            .toLowerCase();
    }

    static register() {
        if (!customElements.get(this.elementName))
            customElements.define(this.elementName, this);
    }

    async connectedCallback() {
        try {
            await this.loadResources();
        } catch (err) {
            console.error(`Error in component ${this.constructor.elementName}:`, err);
        }
    }

    async loadResources() {
        const [html, css] = await Promise.all([
            this.fetchResource('html'),
            this.fetchResource('css')
        ]);

        this.render(html, css);
    }

    async fetchResource(type) {
        const response = await fetch(`/components/${this.constructor.elementName}/${this.constructor.elementName}.${type}`);
        if (!response.ok) {
            throw new Error(`Failed to load ${type.toUpperCase()} for component ${this.constructor.elementName}`);
        }
        return response.text();
    }

    render(html, css) {
        this.shadowRoot.innerHTML = `
            <style>${css}</style>
            ${html}
        `;
    }

    addAutoCleanListener(target, event, handler, once = false) {
        target.addEventListener(event, handler, {once: once});
        this._listeners.add({target, event, handler});
    }

    disconnectedCallback() {
        this._listeners.forEach(({target, event, handler}) => {
            target.removeEventListener(event, handler);
        });
        this._listeners.clear();
    }
}