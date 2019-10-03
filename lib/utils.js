"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function extrasperse(elem, array) {
    const init = [];
    return array.reduce((r, a) => r.concat(elem, a), init);
}
exports.extrasperse = extrasperse;
;
function saneSplit(str, separator) {
    return str.split(separator).filter(word => word != "");
}
exports.saneSplit = saneSplit;
