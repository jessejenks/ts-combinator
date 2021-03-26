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

    describe("zeroOrMore", () => {
        const { zeroOrMore } = Parser;

        const cases: Array<[string, string, Parser<any>, any[]]> = [
            ["aaaaa", "", Parser.exact("a"), ["a", "a", "a", "a", "a"]],
            ["bbbbb", "bbbbb", Parser.exact("a"), []],
            [
                "aaaaabbbbb",
                "bbbbb",
                Parser.exact("a"),
                ["a", "a", "a", "a", "a"],
            ],
        ];

        test.each(cases)(
            "Matches zero or more times",
            (source, remaining, parser, matches) => {
                const result = zeroOrMore(parser).parse(source);

                switch (result.variant) {
                    case Result.Variant.Ok:
                        expect(result.value[0]).toEqual(matches);
                        expect(result.value[1]).toBe(remaining);
                        break;

                    case Result.Variant.Err:
                        fail(result.error);
                }
            },
        );
    });

    describe("oneOrMore", () => {
        const { oneOrMore } = Parser;

        const okCases: Array<[string, string, Parser<any>, any[]]> = [
            ["aaaaa", "", Parser.exact("a"), ["a", "a", "a", "a", "a"]],
            [
                "aaaaabbbbb",
                "bbbbb",
                Parser.exact("a"),
                ["a", "a", "a", "a", "a"],
            ],
        ];

        test.each(okCases)(
            "Matches one or more times",
            (source, remaining, parser, matches) => {
                const result = oneOrMore(parser).parse(source);

                switch (result.variant) {
                    case Result.Variant.Ok:
                        expect(result.value[0]).toEqual(matches);
                        expect(result.value[1]).toBe(remaining);
                        break;

                    case Result.Variant.Err:
                        fail(result.error);
                }
            },
        );

        const errCases: Array<[string, string, Parser<any>]> = [
            ["bbbbb", 'Expected "a" but got "b" instead', Parser.exact("a")],
        ];

        test.each(errCases)(
            "Doesn't match one or more times",
            (source, errMessage, parser) => {
                const result = oneOrMore(parser).parse(source);

                switch (result.variant) {
                    case Result.Variant.Err:
                        expect(result.error).toBe(errMessage);
                        break;

                    case Result.Variant.Ok:
                        fail("Should not have parsed");
                }
            },
        );
    });

    describe("oneOf", () => {
        const { oneOf } = Parser;

        it("fails if no parsers are provided", () => {
            const result = oneOf().parse("anything");

            switch (result.variant) {
                case Result.Variant.Err:
                    expect(result.error).toBe("No parsers provided");
                    break;

                case Result.Variant.Ok:
                    fail("Should not have parsed");
            }
        });

        it("acts like the underlying parser if only one parser is provided", () => {
            const parser = oneOf(Parser.exact("a"));
            let result = parser.parse("abc");

            switch (result.variant) {
                case Result.Variant.Ok:
                    expect(result.value[0]).toEqual("a");
                    expect(result.value[1]).toBe("bc");
                    break;

                case Result.Variant.Err:
                    fail(result.error);
            }

            result = parser.parse("bcd");

            switch (result.variant) {
                case Result.Variant.Err:
                    expect(result.error).toBe(
                        'Expected "a" but got "b" instead',
                    );
                    break;

                case Result.Variant.Ok:
                    fail("Should not have parsed");
            }
        });

        it("matches if any one of the given parsers matches", () => {
            const parseA = Parser.exact("a");
            const parseB = Parser.exact("b");
            const parseC = Parser.exact("c");

            const parser = oneOf(parseA, parseB, parseC);

            let result = parser.parse("abc");

            switch (result.variant) {
                case Result.Variant.Ok:
                    expect(result.value[0]).toEqual("a");
                    expect(result.value[1]).toBe("bc");
                    break;

                case Result.Variant.Err:
                    fail(result.error);
            }

            result = parser.parse("bca");

            switch (result.variant) {
                case Result.Variant.Ok:
                    expect(result.value[0]).toEqual("b");
                    expect(result.value[1]).toBe("ca");
                    break;

                case Result.Variant.Err:
                    fail(result.error);
            }

            result = parser.parse("cab");

            switch (result.variant) {
                case Result.Variant.Ok:
                    expect(result.value[0]).toEqual("c");
                    expect(result.value[1]).toBe("ab");
                    break;

                case Result.Variant.Err:
                    fail(result.error);
            }

            result = parser.parse("f");

            switch (result.variant) {
                case Result.Variant.Err:
                    expect(result.error).toBe(
                        'Expected "c" but got "f" instead',
                    );
                    break;

                case Result.Variant.Ok:
                    fail("Should not have parsed");
            }
        });

        it("matches on the first parser to match", () => {
            let result = oneOf(
                Parser.exact("longer"),
                Parser.exact("long"),
            ).parse("longer matches");

            switch (result.variant) {
                case Result.Variant.Ok:
                    expect(result.value[0]).toEqual("longer");
                    expect(result.value[1]).toBe(" matches");
                    break;

                case Result.Variant.Err:
                    fail(result.error);
            }

            result = oneOf(
                Parser.exact("short"),
                Parser.exact("shorter"),
            ).parse("shorter matches");

            switch (result.variant) {
                case Result.Variant.Ok:
                    expect(result.value[0]).toEqual("short");
                    expect(result.value[1]).toBe("er matches");
                    break;

                case Result.Variant.Err:
                    fail(result.error);
            }
        });
    });
});
