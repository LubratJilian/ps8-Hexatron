import {Component} from "../component/component.js";

export class FormInput extends Component {
    constructor() {
        super();

        this.error = false;
    }

    static get observedAttributes() {
        return [
            'id', 'label', 'type', 'placeholder', 'required',
            'errormessage', 'error', 'maxlength', 'minlength',
            'value', 'pattern'
        ];
    }

    async connectedCallback() {
        await super.connectedCallback();
        this.update();

        this.setupListeners();
    }


    attributeChangedCallback(name, oldValue, newValue) {
        const handlers = {
            'required': () => this.required = newValue !== null && newValue !== "false",
            'error': () => this.error = newValue === "true",
            'maxlength': () => this.maxLength = parseInt(newValue, 10) || null,
            'minlength': () => this.minLength = parseInt(newValue, 10) || 0,
            'pattern': () => {
                try {
                    new RegExp(newValue);
                    this.pattern = newValue;
                } catch (e) {
                    console.error(`Invalid pattern: ${newValue}`, e);
                    this.pattern = '';
                }
            }
        };

        if (!handlers[name] && oldValue !== newValue)
            this[name] = newValue;
        else if (handlers[name])
            handlers[name]();

        if (this.type && this.id)
            this.update();
    }

    update() {
        if (!this.type || !this.id)
            return;

        const labelElement = this.shadowRoot.querySelector('label');
        if (labelElement) {
            labelElement.setAttribute('for', this.id);
            labelElement.textContent = this.label || '';
        }

        this.inputElement = this.shadowRoot.querySelector('input');
        if (!this.inputElement)
            return;

        const attributes = {
            type: this.type,
            id: this.id,
            placeholder: this.placeholder,
            maxlength: this.maxLength,
            minlength: this.minLength,
            pattern: this.pattern,
            required: this.required ? '' : null,
            value: this.value
        };

        Object.entries(attributes).forEach(([attr, value]) => {
            if (value !== null && value !== undefined && value !== false)
                this.inputElement.setAttribute(attr, value);
            else
                this.inputElement.removeAttribute(attr);
        });

        this.inputElement.classList.toggle('error', this.error);

        this.errorElement = this.shadowRoot.querySelector('.error-message');
        if (this.errorElement) {
            this.errorElement.textContent = this["errormessage"];
            this.errorElement.classList.toggle('visible', !!this.error && !!this["errormessage"]);
        }
    }

    setupListeners() {
        this.setupInputListener();
        this.setupSubmitListener();
    }

    setupInputListener() {
        const charCounter = this.shadowRoot.querySelector('.char-counter');

        this.addAutoCleanListener(this.shadowRoot.querySelector('input'), "input", (e) => {
            this.dismissError();

            if (this.maxLength && charCounter && e.target.value.length !== 0) {
                const remainingChars = this.maxLength - e.target.value.length;
                charCounter.textContent = `${remainingChars} character${(remainingChars > 1) ? "s" : ""} remaining`;
            } else {
                charCounter.textContent = ``;
            }
        });
    }

    setupSubmitListener() {
        this.addAutoCleanListener(this.inputElement, "keydown", (event) => {
            if (event.key === 'Enter') {
                console.log("Enter key pressed. Requesting form submission...");

                this.closest('form')?.dispatchEvent(new Event('submit'));
            }
        });
    }

    dismissError() {
        if (this.inputElement)
            this.inputElement.classList.remove("error");
        if (this["errormessage"]) {
            this.errorElement.classList.remove("visible");
            this.removeAttribute("errormessage");
        }
    }
}