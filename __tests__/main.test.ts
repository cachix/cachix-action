import {extrasperse, saneSplit} from '../src/strings'

test('extrasperse', async() => {
    expect(extrasperse('-A', ["foo", "bar"])).toEqual(["-A", "foo", "-A", "bar"]);
    expect(extrasperse('-A', [])).toEqual([]);
});

test('saneSplit', async() => {
    expect(saneSplit("", /\s+/)).toEqual([]);
    expect(saneSplit("foo bar", /\s+/)).toEqual(["foo", "bar"]);
})

// TODO: hopefully github actions will support integration tests