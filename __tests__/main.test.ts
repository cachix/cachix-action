import {prependEach, nonEmptySplit} from '../src/strings'

test('prependEach', async() => {
    expect(prependEach('-A', ["foo", "bar"])).toEqual(["-A", "foo", "-A", "bar"]);
    expect(prependEach('-A', [])).toEqual([]);
});

test('nonEmptySplit', async() => {
    expect(nonEmptySplit("", /\s+/)).toEqual([]);
    expect(nonEmptySplit("foo bar", /\s+/)).toEqual(["foo", "bar"]);
})

// TODO: hopefully github actions will support integration tests