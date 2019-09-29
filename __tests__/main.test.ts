import {extrasperse} from '../src/utils'

test('extrasperse', async() => {
    expect(extrasperse('-A', ["foo", "bar"])).toEqual(["-A", "foo", "-A", "bar"]);
    expect(extrasperse('-A', [])).toEqual([])
});

// TODO: hopefully github actions will support integration tests