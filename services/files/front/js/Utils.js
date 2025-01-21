export function resizeCanvas(context, percentWidth, percentHeight, id, drawingFunction, callingContext) {
    const rect = context.getBoundingClientRect();
    const canvas = context.shadowRoot.getElementById(id);
    canvas.setAttribute("width", rect.width * percentWidth);
    canvas.setAttribute("height", rect.height * percentHeight);
    if (drawingFunction !== null) {
        drawingFunction(callingContext);
    }
}

export function convertRemToPixels(rem) {
    return rem * parseFloat(getComputedStyle(document.documentElement).fontSize);
}

export function hexToRGB(hex) {
    let r = parseInt(hex.substring(1, 3), 16);
    let g = parseInt(hex.substring(3, 5), 16);
    let b = parseInt(hex.substring(5), 16);
    return [r, g, b];
}

export function rgbToHex([r, g, b]) {
    let red = r.toString(16).padStart(2, "0");
    let green = g.toString(16).padStart(2, "0");
    let blue = b.toString(16).padStart(2, "0");
    return "#" + red + green + blue;

}