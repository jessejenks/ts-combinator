import { Result } from "./Result";
import { Parser } from "./Parser";

describe("Individual Parser functions", () => {
    describe("exact", () => {
        const { exact } = Parser;

        const okCases: Array<[string, string]> = [["hello", "hello world"]];

        test.each(okCases)("Matches '%s' against '%s'", (toMatch, source) => {
            const result = exact(toMatch).parse(source);
            switch (result.variant) {
                case Result.Variant.Ok:
                    expect(result.value[0]).toBe(toMatch);
                    break;

                case Result.Variant.Err:
                    fail(result.error);
            }
        });

        const errCases: Array<[string, string, string]> = [
            [
                "goodbye",
                "hello world",
                'Expected "goodbye" but got "hello w" instead',
            ],
        ];

        test.each(errCases)(
            "Does not match '%s' against '%s'",
            (toMatch, source, errMessage) => {
                const result = exact(toMatch).parse(source);
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
            "Matches zero or more whitespace characters",
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

    describe("character classes", () => {
        const {
            digits,
            singleDigit,
            alpha,
            singleAlpha,
            upper,
            singleUpper,
            lower,
            singleLower,
            alphaNum,
            singleAlphaNum,
        } = Parser;

        type TestCharClassesOptions = {
            okCasesMessage: string;
            errCasesMessage: string;
            okCases: Array<[string, string, string]>;
            errCases: Array<[string, string, string]>;
        };
        function testCharClasses(
            singleParser: Parser<string>,
            multipleParser: Parser<string>,
            {
                okCasesMessage,
                errCasesMessage,
                okCases,
                errCases,
            }: TestCharClassesOptions,
        ) {
            test.each(okCases)(
                okCasesMessage,
                (source, singleCase, multipleCase) => {
                    let result = singleParser.parse(source);
                    switch (result.variant) {
                        case Result.Variant.Ok:
                            expect(result.value[1]).toBe(singleCase);
                            break;

                        case Result.Variant.Err:
                            fail(result.error);
                    }

                    result = multipleParser.parse(source);
                    switch (result.variant) {
                        case Result.Variant.Ok:
                            expect(result.value[1]).toBe(multipleCase);
                            break;

                        case Result.Variant.Err:
                            fail(result.error);
                    }
                },
            );

            test.each(errCases)(
                errCasesMessage,
                (source, singleCase, multipleCase) => {
                    let result = singleParser.parse(source);
                    switch (result.variant) {
                        case Result.Variant.Err:
                            expect(result.error).toBe(singleCase);
                            break;

                        case Result.Variant.Ok:
                            fail("Should not have parsed");
                    }

                    result = multipleParser.parse(source);
                    switch (result.variant) {
                        case Result.Variant.Err:
                            expect(result.error).toBe(multipleCase);
                            break;

                        case Result.Variant.Ok:
                            fail("Should not have parsed");
                    }
                },
            );
        }

        describe("digits and singleDigit", () => {
            const okCases: Array<[string, string, string]> = [
                ["012345", "12345", ""],
                ["012345abcde", "12345abcde", "abcde"],
                ["111", "11", ""],
            ];

            const errCases: Array<[string, string, string]> = [
                [
                    "",
                    'Expected a digit but got "" instead',
                    'Expected digits but got "" instead',
                ],
                [
                    "abcde",
                    'Expected a digit but got "a" instead',
                    'Expected digits but got "a" instead',
                ],
            ];

            testCharClasses(singleDigit(), digits(), {
                okCasesMessage: "Matches digits in '%s'",
                errCasesMessage: "Does not match any digits in '%s'",
                okCases,
                errCases,
            });
        });

        describe("alpha and singleAlpha", () => {
            const okCases: Array<[string, string, string]> = [
                ["Abcde", "bcde", ""],
                ["aBcDe012345", "BcDe012345", "012345"],
                ["aAa", "Aa", ""],
            ];

            const errCases: Array<[string, string, string]> = [
                [
                    "",
                    'Expected a character but got "" instead',
                    'Expected characters but got "" instead',
                ],
                [
                    "12345",
                    'Expected a character but got "1" instead',
                    'Expected characters but got "1" instead',
                ],
            ];

            testCharClasses(singleAlpha(), alpha(), {
                okCasesMessage: "Matches characters in '%s'",
                errCasesMessage: "Does not match any characters in '%s'",
                okCases,
                errCases,
            });
        });

        describe("upper and singleUpper", () => {
            const okCases: Array<[string, string, string]> = [
                ["ABCDE", "BCDE", ""],
                ["ABCDE012345", "BCDE012345", "012345"],
                ["AAA", "AA", ""],
            ];

            const errCases: Array<[string, string, string]> = [
                [
                    "",
                    'Expected an upper case character but got "" instead',
                    'Expected upper case characters but got "" instead',
                ],
                [
                    "12345",
                    'Expected an upper case character but got "1" instead',
                    'Expected upper case characters but got "1" instead',
                ],
            ];

            testCharClasses(singleUpper(), upper(), {
                okCasesMessage: "Matches upper case characters in '%s'",
                errCasesMessage:
                    "Does not match any upper case characters in '%s'",
                okCases,
                errCases,
            });
        });

        describe("lower and singleLower", () => {
            const okCases: Array<[string, string, string]> = [
                ["abcde", "bcde", ""],
                ["abcde012345", "bcde012345", "012345"],
                ["aaa", "aa", ""],
            ];

            const errCases: Array<[string, string, string]> = [
                [
                    "",
                    'Expected a lower case character but got "" instead',
                    'Expected lower case characters but got "" instead',
                ],
                [
                    "12345",
                    'Expected a lower case character but got "1" instead',
                    'Expected lower case characters but got "1" instead',
                ],
            ];

            testCharClasses(singleLower(), lower(), {
                okCasesMessage: "Matches lower case characters in '%s'",
                errCasesMessage:
                    "Does not match any lower case characters in '%s'",
                okCases,
                errCases,
            });
        });

        describe("alphaNum and singleAlphaNum", () => {
            const okCases: Array<[string, string, string]> = [
                ["abcde", "bcde", ""],
                ["abcde012345", "bcde012345", ""],
                ["aaa", "aa", ""],
                ["2021years-03months", "021years-03months", "-03months"],
            ];

            const errCases: Array<[string, string, string]> = [
                [
                    "",
                    'Expected an alpha numeric character but got "" instead',
                    'Expected alpha numeric characters but got "" instead',
                ],
                [
                    "$100",
                    'Expected an alpha numeric character but got "$" instead',
                    'Expected alpha numeric characters but got "$" instead',
                ],
            ];

            testCharClasses(singleAlphaNum(), alphaNum(), {
                okCasesMessage: "Matches alpha numeric characters in '%s'",
                errCasesMessage:
                    "Does not match any alpha numeric characters in '%s'",
                okCases,
                errCases,
            });
        });
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
            "Matches with given parser zero or more times",
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
