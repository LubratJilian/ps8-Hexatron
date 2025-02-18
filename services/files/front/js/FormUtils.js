export function checkConfirmPassword(confirmElement, passwordValue, confirmPassword) {
    const isValid = passwordValue === confirmPassword;
    updateErrorMessage(confirmElement, !isValid, "Passwords don't match");
    return isValid;
}

export function checkInputsValidity(inputs) {
    const requiredInputs = Array.from(inputs).filter(input => input.hasAttribute("required"));
    const minLengthInputs = Array.from(inputs).filter(input => input.hasAttribute("minlength"));
    const patternInputs = Array.from(inputs).filter(input => input.hasAttribute("pattern"));

    const isRequiredValid = checkRequired(requiredInputs);
    const isMinLengthValid = checkMinLengthInputs(minLengthInputs);
    const isPatternValid = checkPatternInputs(patternInputs);

    return isRequiredValid && isMinLengthValid && isPatternValid;
}

function updateErrorMessage(input, hasError, message) {
    const errorAttr = "error";
    const errorMessageAttr = "errormessage";

    let currentError = input.getAttribute(errorMessageAttr);

    if (hasError && !currentError) {
        input.setAttribute(errorAttr, "true");
        input.setAttribute(errorMessageAttr, message);
    } else if (!currentError) {
        input.setAttribute(errorAttr, "false");
        input.removeAttribute(errorMessageAttr);
    }
}

function checkRequired(inputs) {
    let isValid = true;

    inputs.forEach(input => {
        const value = input.shadowRoot.querySelector("input").value;
        const hasError = !value || value.length === 0;
        updateErrorMessage(input, hasError, "This field is required");
        isValid = isValid && !hasError;
    });

    return isValid;
}

function checkMinLengthInputs(inputs) {
    let isValid = true;

    inputs.forEach(input => {
        const value = input.shadowRoot.querySelector("input").value;
        const minLength = input.getAttribute("minlength");
        const hasError = value.length < minLength;
        const message = `The minimum length required is ${minLength}`;
        updateErrorMessage(input, hasError, message);
        isValid = isValid && !hasError;
    });

    return isValid;
}

function checkPatternInputs(inputs) {
    let isValid = true;

    inputs.forEach(input => {
        const value = input.shadowRoot.querySelector("input").value;
        const pattern = input.getAttribute("pattern");
        const regex = new RegExp(pattern);
        const hasError = value && !regex.test(value);
        console.log(regex.test(value));

        const errorMessage = hasError ? getPatternErrorMessage(pattern) : null;
        updateErrorMessage(input, hasError, errorMessage);
        isValid = isValid && !hasError;
    });

    return isValid;
}

function getPatternErrorMessage(pattern) {
    let allowedChars = extractPatternMessage(pattern);

    if (!allowedChars)
        allowedChars = "Any valid character";

    return `Pattern mismatch. Allowed characters: ${allowedChars}`;
}

function extractPatternMessage(pattern) {
    let allowedChars = pattern
        .replace(/[^A-Za-z0-9]/g, '')
        .replace(/([A-Za-z0-9]+)/g, (match) => match.split('').join(', '));

    return allowedChars || "";
}

export function getInputsData(inputs) {
    return Object.fromEntries(
        Array.from(inputs).map(formInput => {
            if (formInput.shadowRoot) {
                const inputElement = formInput.shadowRoot.querySelector("input");
                if (inputElement) {
                    return [inputElement.id, inputElement.value];
                }
            }
            return null;
        }).filter(([_, value]) => value !== null)
    );
}
