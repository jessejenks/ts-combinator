import { Maybe } from "./Maybe";
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
                    expect(source.slice(result.value[1])).toBe(source);
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
                        expect(source.slice(result.value[1])).toBe(remaining);
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
                            expect(source.slice(result.value[1])).toBe(
                                singleCase,
                            );
                            break;

                        case Result.Variant.Err:
                            fail(result.error);
                    }

                    result = multipleParser.parse(source);
                    switch (result.variant) {
                        case Result.Variant.Ok:
                            expect(source.slice(result.value[1])).toBe(
                                multipleCase,
                            );
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

    describe("numbers", () => {
        describe("number and numberString", () => {
            const { number, numberString } = Parser;

            const okCases: Array<[string, string, string]> = [
                ["12345 hello", "12345", " hello"],
                ["3.14159 hello", "3.14159", " hello"],
                ["+12", "+12", ""],
                ["-12", "-12", ""],
                ["+12.0", "+12.0", ""],
                ["-12.0", "-12.0", ""],
                ["0", "0", ""],
                ["01234", "0", "1234"],
                ["0.14159 hello", "0.14159", " hello"],
            ];

            test.each(okCases)(
                "Parses '%s' as the string '%s'",
                (source, match, remaining) => {
                    const result = numberString().parse(source);

                    switch (result.variant) {
                        case Result.Variant.Ok:
                            expect(result.value[0]).toBe(match);
                            expect(source.slice(result.value[1])).toBe(
                                remaining,
                            );
                            break;

                        case Result.Variant.Err:
                            fail(result.error);
                    }
                },
            );

            test.each(okCases)(
                "Parses '%s' as the number %d",
                (source, match, remaining) => {
                    const result = number().parse(source);

                    switch (result.variant) {
                        case Result.Variant.Ok:
                            expect(result.value[0]).toBe(Number(match));
                            expect(source.slice(result.value[1])).toBe(
                                remaining,
                            );
                            break;

                        case Result.Variant.Err:
                            fail(result.error);
                    }
                },
            );

            // error messages could be improved
            const errCases: Array<[string, string]> = [
                ["bob", 'Expected a number but got "b" instead'],
                [".14159", 'Expected a number but got "." instead'],
                ["+hello", 'Expected a number but got "+" instead'],
            ];

            test.each(errCases)(
                "Does not parse '%s' as a string",
                (source, errMessage) => {
                    const result = numberString().parse(source);

                    switch (result.variant) {
                        case Result.Variant.Err:
                            expect(result.error).toBe(errMessage);
                            break;

                        case Result.Variant.Ok:
                            fail("Should not have parsed");
                    }
                },
            );

            test.each(errCases)(
                "Does not parse '%s' as a number",
                (source, errMessage) => {
                    const result = number().parse(source);

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

        describe("int", () => {
            const { int } = Parser;

            it("parses a number, then checks for an int", () => {
                const source = "12345 hello";
                let result = int().parse(source);
                switch (result.variant) {
                    case Result.Variant.Ok:
                        expect(result.value[0]).toBe(12345);
                        expect(source.slice(result.value[1])).toBe(" hello");
                        break;

                    case Result.Variant.Err:
                        fail(result.error);
                }

                result = int().parse("123.1415 hello");
                switch (result.variant) {
                    case Result.Variant.Err:
                        expect(result.error).toBe(
                            'Expected an integer but got "123.1415" instead',
                        );
                        break;

                    case Result.Variant.Ok:
                        fail("Should not have parsed");
                }
            });
        });

        describe("integerPart", () => {
            const { integerPart } = Parser;

            it("greedily captures the integer part and returns a string", () => {
                const source = "123.1415 hello";
                const result = integerPart().parse(source);
                switch (result.variant) {
                    case Result.Variant.Ok:
                        expect(result.value[0]).toBe("123");
                        expect(source.slice(result.value[1])).toBe(
                            ".1415 hello",
                        );
                        break;

                    case Result.Variant.Err:
                        fail(result.error);
                }
            });
        });
    });

    describe("sequence", () => {
        const { sequence } = Parser;

        it("can run a basic sequence of parsers", () => {
            const source = "yes, and";
            const result = sequence(
                Parser.exact("yes,"),
                Parser.spaces(),
            ).parse(source);

            switch (result.variant) {
                case Result.Variant.Ok:
                    expect(result.value[0]).toEqual(["yes,", " "]);
                    expect(source.slice(result.value[1])).toBe("and");
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
                        expect(source.slice(result.value[1])).toBe(remaining);
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
                        expect(source.slice(result.value[1])).toBe(remaining);
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
            let source = "abc";
            const parser = oneOf(Parser.exact("a"));
            let result = parser.parse(source);

            switch (result.variant) {
                case Result.Variant.Ok:
                    expect(result.value[0]).toEqual("a");
                    expect(source.slice(result.value[1])).toBe("bc");
                    break;

                case Result.Variant.Err:
                    fail(result.error);
            }

            source = "bcd";
            result = parser.parse(source);

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

            let source = "abc";
            let result = parser.parse(source);

            switch (result.variant) {
                case Result.Variant.Ok:
                    expect(result.value[0]).toEqual("a");
                    expect(source.slice(result.value[1])).toBe("bc");
                    break;

                case Result.Variant.Err:
                    fail(result.error);
            }

            source = "bca";
            result = parser.parse(source);

            switch (result.variant) {
                case Result.Variant.Ok:
                    expect(result.value[0]).toEqual("b");
                    expect(source.slice(result.value[1])).toBe("ca");
                    break;

                case Result.Variant.Err:
                    fail(result.error);
            }

            source = "cab";
            result = parser.parse(source);

            switch (result.variant) {
                case Result.Variant.Ok:
                    expect(result.value[0]).toEqual("c");
                    expect(source.slice(result.value[1])).toBe("ab");
                    break;

                case Result.Variant.Err:
                    fail(result.error);
            }

            source = "f";
            result = parser.parse(source);

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
            let source = "longer matches";
            let result = oneOf(
                Parser.exact("longer"),
                Parser.exact("long"),
            ).parse(source);

            switch (result.variant) {
                case Result.Variant.Ok:
                    expect(result.value[0]).toEqual("longer");
                    expect(source.slice(result.value[1])).toBe(" matches");
                    break;

                case Result.Variant.Err:
                    fail(result.error);
            }

            source = "shorter matches";
            result = oneOf(
                Parser.exact("short"),
                Parser.exact("shorter"),
            ).parse(source);

            switch (result.variant) {
                case Result.Variant.Ok:
                    expect(result.value[0]).toEqual("short");
                    expect(source.slice(result.value[1])).toBe("er matches");
                    break;

                case Result.Variant.Err:
                    fail(result.error);
            }
        });
    });

    describe("map", () => {
        const { map } = Parser;

        it("does nothing if given identity function", () => {
            const source = "anything";
            const result = map((x) => x, Parser.exact("anything")).parse(
                source,
            );

            switch (result.variant) {
                case Result.Variant.Ok:
                    expect(result.value[0]).toEqual("anything");
                    expect(source.slice(result.value[1])).toBe("");
                    break;

                case Result.Variant.Err:
                    fail(result.error);
            }
        });

        it("can transform parsed values", () => {
            const source = "anything";
            const result = map(
                (match: string) => ({ key: "annotation", match: match }),
                Parser.exact("anything"),
            ).parse(source);

            switch (result.variant) {
                case Result.Variant.Ok:
                    expect(result.value[0]).toEqual({
                        key: "annotation",
                        match: "anything",
                    });
                    expect(source.slice(result.value[1])).toBe("");
                    break;

                case Result.Variant.Err:
                    fail(result.error);
            }
        });

        it("can remove unwanted pieces of parsed values", () => {
            const source = "123-abc";
            const result = map(
                ([dig, , alph]) => [dig, alph],
                Parser.sequence(
                    Parser.digits(),
                    Parser.exact("-"),
                    Parser.alpha(),
                ),
            ).parse(source);

            switch (result.variant) {
                case Result.Variant.Ok:
                    expect(result.value[0]).toEqual(["123", "abc"]);
                    expect(source.slice(result.value[1])).toBe("");
                    break;

                case Result.Variant.Err:
                    fail(result.error);
            }
        });
    });

    describe("optional", () => {
        const { optional } = Parser;

        it("parses with given parser, or goes with default value", () => {
            const result = optional(Parser.exact("abcde"), "default").parse(
                "abcdnope",
            );
            switch (result.variant) {
                case Result.Variant.Ok:
                    expect(result.value[0]).toEqual("default");
                    break;

                case Result.Variant.Err:
                    fail(result.error);
            }
        });

        describe("with 'sequence' and 'oneOf'", () => {
            const { sequence, oneOf, exact } = Parser;
            const parser = sequence(
                optional(exact("-"), "+"),
                optional(exact("("), "["),
                optional(oneOf(exact("a"), exact("c")), "d"),
                exact("blah"),
            );

            const okCases: Array<[string, string[]]> = [
                ["blah", ["+", "[", "d", "blah"]],
                ["-blah", ["-", "[", "d", "blah"]],
                ["(blah", ["+", "(", "d", "blah"]],
                ["-(blah", ["-", "(", "d", "blah"]],

                ["ablah", ["+", "[", "a", "blah"]],
                ["-ablah", ["-", "[", "a", "blah"]],
                ["(ablah", ["+", "(", "a", "blah"]],
                ["-(ablah", ["-", "(", "a", "blah"]],

                ["cblah", ["+", "[", "c", "blah"]],
                ["-cblah", ["-", "[", "c", "blah"]],
                ["(cblah", ["+", "(", "c", "blah"]],
                ["-(cblah", ["-", "(", "c", "blah"]],
            ];

            test.each(okCases)("Parses '%s'", (source, matches) => {
                const result = parser.parse(source);
                switch (result.variant) {
                    case Result.Variant.Ok:
                        expect(result.value[0]).toEqual(matches);
                        break;

                    case Result.Variant.Err:
                        fail(result.error);
                }
            });

            const errCases: Array<[string, string]> = [
                ["(-blah", 'Expected "blah" but got "-bla" instead'],
                ["(-ablah", 'Expected "blah" but got "-abl" instead'],
                ["(-cblah", 'Expected "blah" but got "-cbl" instead'],
            ];

            test.each(errCases)(
                "Does not parse, as expected",
                (source, errMessage) => {
                    const result = parser.parse(source);
                    switch (result.variant) {
                        case Result.Variant.Err:
                            expect(result.error).toEqual(errMessage);
                            break;

                        case Result.Variant.Ok:
                            fail("Should not have parsed");
                    }
                },
            );
        });
    });

    describe("maybe", () => {
        const { maybe } = Parser;

        it("parses to produce a Maybe typed value", () => {
            const result = maybe(Parser.exact("abcde")).parse("abcdnope");
            switch (result.variant) {
                case Result.Variant.Ok:
                    if (Maybe.isJust(result.value[0])) {
                        fail("Should not have parsed");
                    }
                    expect(Maybe.isNothing(result.value[0]));
                    break;

                case Result.Variant.Err:
                    fail(result.error);
            }
        });

        describe("with 'sequence' and 'map'", () => {
            const parser: Parser<
                | [string, string]
                | [string, string, string]
                | [string, string, string, string]
            > = Parser.map(
                ([a, maybeB, maybeC, d]) =>
                    Maybe.isJust(maybeB)
                        ? Maybe.isJust(maybeC)
                            ? [a, maybeB.value, maybeC.value, d]
                            : [a, maybeB.value, d]
                        : Maybe.isJust(maybeC)
                        ? [a, maybeC.value, d]
                        : [a, d],

                Parser.sequence(
                    Parser.exact("a"),
                    maybe(Parser.exact("b")),
                    maybe(Parser.exact("c")),
                    Parser.exact("d"),
                ),
            );

            const okCases: Array<[string, string[]]> = [
                ["ad", ["a", "d"]],
                ["abd", ["a", "b", "d"]],
                ["acd", ["a", "c", "d"]],
                ["abcd", ["a", "b", "c", "d"]],
            ];

            test.each(okCases)(
                "parses '%s' against 'ab?c?d'",
                (source, matches) => {
                    const result = parser.parse(source);

                    switch (result.variant) {
                        case Result.Variant.Ok:
                            expect(result.value[0]).toEqual(matches);
                            break;

                        case Result.Variant.Err:
                            fail(result.error);
                    }
                },
            );
        });

        describe("with 'sequence', 'oneOf', and 'map'", () => {
            const parser: Parser<
                [string, string] | [string, string, string]
            > = Parser.map(
                ([a, maybeBOrC, d]) =>
                    Maybe.isJust(maybeBOrC) ? [a, maybeBOrC.value, d] : [a, d],

                Parser.sequence(
                    Parser.exact("a"),
                    maybe(Parser.oneOf(Parser.exact("b"), Parser.exact("c"))),
                    Parser.exact("d"),
                ),
            );

            const okCases: Array<[string, string[]]> = [
                ["ad", ["a", "d"]],
                ["abd", ["a", "b", "d"]],
                ["acd", ["a", "c", "d"]],
            ];

            test.each(okCases)("parses '%s'", (source, matches) => {
                const result = parser.parse(source);

                switch (result.variant) {
                    case Result.Variant.Ok:
                        expect(result.value[0]).toEqual(matches);
                        break;

                    case Result.Variant.Err:
                        fail(result.error);
                }
            });

            const errCases: Array<[string, string]> = [
                ["abcd", 'Expected "d" but got "c" instead'],
            ];

            test.each(errCases)("does not parse %s", (source, errMessage) => {
                const result = parser.parse(source);

                switch (result.variant) {
                    case Result.Variant.Err:
                        expect(result.error).toBe(errMessage);
                        break;

                    case Result.Variant.Ok:
                        fail("Should not have parsed");
                }
            });
        });
    });
});
