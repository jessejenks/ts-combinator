import { Parser } from "./Parser";

describe("Individual Parser functions", () => {
    describe("exact", () => {
        const { exact } = Parser;

        const cases: Array<[string, string, boolean]> = [
            ["hello", "hello world", true],
            ["goodbye", "hello world", false],
        ];

        test.each(cases)(
            "Tries to match %s against %s as expected",
            (toMatch, source, shouldHaveMatched) => {
                const result = exact(toMatch).parse(source);
                expect(result.ok).toBe(shouldHaveMatched);
            },
        );
    });

    describe("succeed", () => {
        const { succeed } = Parser;

        const cases: Array<[any, string]> = [
            ["anything", "any source"],
            [12, "any source"],
        ];

        test.each(cases)("Always succeeds with %s", (value, source) => {
            const result = succeed(value).parse(source);
            expect(result.ok).toBe(true);
            expect(result.value[0]).toBe(value);
            expect(result.value[1]).toBe(source);
        });
    });
});
