import {Component} from "../component/component.js";
import {FormInput} from "../form-input/form-input.js";
import {checkInputsValidity, getInputsData} from "../../js/FormUtils.js";

export class BaseAuth extends Component {
    constructor() {
        super();

        FormInput.register();
    }

    async connectedCallback() {
        await super.connectedCallback();

        this.setupListeners();
    }

    setupListeners() {
        const submitButton = this.shadowRoot.querySelector('submit-button');

        Array.from(this.getFormInputs())
            .forEach(input => this.addAutoCleanListener(input, "keydown", (event) => {
                if (event.key === 'Enter')
                    this.submit();
            }));

        if (submitButton)
            this.addAutoCleanListener(submitButton, 'click', () => this.submit());
    }

    submit() {
        if (!this.checkValidity())
            return;

        this.handleSubmit();
    }

    checkValidity() {
        const formInputs = this.getFormInputs();
        return checkInputsValidity(formInputs);
    }

    handleSubmit() {
        console.warn("handleSubmit must be implemented by the child class.");
    }

    getFormInputs() {
        return this.shadowRoot.querySelectorAll("form-input");
    }

    getFormData() {
        return getInputsData(this.getFormInputs());
    }
}