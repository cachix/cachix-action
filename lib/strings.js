"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function prependEach(elem, array) {
    const init = [];
    return array.reduce((r, a) => r.concat(elem, a), init);
}
exports.prependEach = prependEach;
;
function nonEmptySplit(str, separator) {
    return str.split(separator).filter(word => word != "");
}
exports.nonEmptySplit = nonEmptySplit;
