import { Result } from "./Result";
import { Parser } from "./Parser";

describe("Individual Parser functions", () => {
    describe("exact", () => {
        const { exact } = Parser;

        const cases: Array<[string, string, boolean]> = [
            ["hello", "hello world", true],
            ["goodbye", "hello world", false],
        ];

        test.each(cases)(
            "Tries to match '%s' against '%s' as expected",
            (toMatch, source, shouldHaveMatched) => {
                const result = exact(toMatch).parse(source);
                expect(Result.isOk(result)).toBe(shouldHaveMatched);
            },
        );
    });

    describe("succeed", () => {
        const { succeed } = Parser;

        const cases: Array<[any, string]> = [
            ["anything", "any source"],
            [12, "any source"],
        ];

        test.each(cases)("Always succeeds with '%s'", (value, source) => {
            const result = succeed(value).parse(source);
            switch (result.variant) {
                case Result.Variant.Ok:
                    expect(result.value[0]).toBe(value);
                    expect(result.value[1]).toBe(source);
                    break;

                case Result.Variant.Err:
                    fail(result.error);
            }
        });
    });

    describe("spaces", () => {
        const { spaces } = Parser;

        const cases: Array<[string, string]> = [
            ["0 spaces", "0 spaces"],
            [" 1 space", "1 space"],
            ["   4 spaces", "4 spaces"],
            [" \t\n\rother whitespace", "other whitespace"],
        ];

        test.each(cases)(
            "chomps 0 or more whitespace from beginning",
            (source, remaining) => {
                const result = spaces().parse(source);
                switch (result.variant) {
                    case Result.Variant.Ok:
                        expect(result.value[1]).toBe(remaining);
                        break;

                    case Result.Variant.Err:
                        fail(result.error);
                }
            },
        );
    });

    describe("sequence", () => {
        const { sequence } = Parser;

        it("can run a basic sequence of parsers", () => {
            const result = sequence(
                Parser.exact("yes,"),
                Parser.spaces(),
            ).parse("yes, and");

            switch (result.variant) {
                case Result.Variant.Ok:
                    expect(result.value[0]).toEqual(["yes,", " "]);
                    expect(result.value[1]).toBe("and");
                    break;

                case Result.Variant.Err:
                    fail(result.error);
            }
        });

        it("fails on the first parser to fail", () => {
            const result = sequence(
                Parser.exact("a"),
                Parser.exact("b"),
                Parser.exact("c"),
                Parser.exact("d"),
                Parser.exact("e"),
            ).parse("abcfg");

            switch (result.variant) {
                case Result.Variant.Err:
                    expect(result.error).toBe(
                        `Expected "d" but got "f" instead`,
                    );
                    break;

                case Result.Variant.Ok:
                    fail("Should not have parsed");
            }
        });
    });
});
