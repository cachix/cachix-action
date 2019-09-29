export function extrasperse (elem: string, array: string[]) {
    const init: string[] = [];
    return array.reduce((r, a) => r.concat(elem, a), init)
  };
  