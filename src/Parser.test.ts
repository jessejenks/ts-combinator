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
                    expect(result.value.parsed).toBe(toMatch);
                    break;

                case Result.Variant.Err:
                    fail(result.error);
            }
        });

        const errCases: Array<[string, string, string]> = [
            [
                "goodbye",
                "hello world",
                'Error at (line: 1, column: 1)\nExpected "goodbye" but got "hello w" instead\n\nhello worl\n^',
            ],
        ];

        test.each(errCases)(
            "Does not match '%s' against '%s'",
            (toMatch, source, errMessage) => {
                const result = exact(toMatch).parse(source);
                switch (result.variant) {
                    case Result.Variant.Err:
                        expect(result.error.message).toBe(errMessage);
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
                    expect(result.value.parsed).toBe(value);
                    expect(source.slice(result.value.index)).toBe(source);
                    break;

                case Result.Variant.Err:
                    fail(result.error);
            }
        });
    });

    describe("fail", () => {
        const { fail } = Parser;

        const cases: Array<[string, string]> = [
            ["error message", "any source"],
        ];

        test.each(cases)("Always fails with '%s'", (errMessage, source) => {
            const result = fail(errMessage).parse(source);
            switch (result.variant) {
                case Result.Variant.Err:
                    expect(result.error.message).toMatch(errMessage);
                    break;

                case Result.Variant.Ok:
                    fail("Should not have parsed");
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
                        expect(source.slice(result.value.index)).toBe(
                            remaining,
                        );
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
                            expect(source.slice(result.value.index)).toBe(
                                singleCase,
                            );
                            break;

                        case Result.Variant.Err:
                            fail(result.error);
                    }

                    result = multipleParser.parse(source);
                    switch (result.variant) {
                        case Result.Variant.Ok:
                            expect(source.slice(result.value.index)).toBe(
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
                            expect(result.error.message).toBe(singleCase);
                            break;

                        case Result.Variant.Ok:
                            fail("Should not have parsed");
                    }

                    result = multipleParser.parse(source);
                    switch (result.variant) {
                        case Result.Variant.Err:
                            expect(result.error.message).toBe(multipleCase);
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
                    'Error at (line: 1, column: 1)\nExpected a digit but got "" instead\n\n\n^',
                    'Error at (line: 1, column: 1)\nExpected digits but got "" instead\n\n\n^',
                ],
                [
                    "abcde",
                    'Error at (line: 1, column: 1)\nExpected a digit but got "a" instead\n\nabcde\n^',
                    'Error at (line: 1, column: 1)\nExpected digits but got "a" instead\n\nabcde\n^',
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
                    'Error at (line: 1, column: 1)\nExpected a character but got "" instead\n\n\n^',
                    'Error at (line: 1, column: 1)\nExpected characters but got "" instead\n\n\n^',
                ],
                [
                    "12345",
                    'Error at (line: 1, column: 1)\nExpected a character but got "1" instead\n\n12345\n^',
                    'Error at (line: 1, column: 1)\nExpected characters but got "1" instead\n\n12345\n^',
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
                    'Error at (line: 1, column: 1)\nExpected an upper case character but got "" instead\n\n\n^',
                    'Error at (line: 1, column: 1)\nExpected upper case characters but got "" instead\n\n\n^',
                ],
                [
                    "12345",
                    'Error at (line: 1, column: 1)\nExpected an upper case character but got "1" instead\n\n12345\n^',
                    'Error at (line: 1, column: 1)\nExpected upper case characters but got "1" instead\n\n12345\n^',
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
                    'Error at (line: 1, column: 1)\nExpected a lower case character but got "" instead\n\n\n^',
                    'Error at (line: 1, column: 1)\nExpected lower case characters but got "" instead\n\n\n^',
                ],
                [
                    "12345",
                    'Error at (line: 1, column: 1)\nExpected a lower case character but got "1" instead\n\n12345\n^',
                    'Error at (line: 1, column: 1)\nExpected lower case characters but got "1" instead\n\n12345\n^',
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
                    'Error at (line: 1, column: 1)\nExpected an alpha numeric character but got "" instead\n\n\n^',
                    'Error at (line: 1, column: 1)\nExpected alpha numeric characters but got "" instead\n\n\n^',
                ],
                [
                    "$100",
                    'Error at (line: 1, column: 1)\nExpected an alpha numeric character but got "$" instead\n\n$100\n^',
                    'Error at (line: 1, column: 1)\nExpected alpha numeric characters but got "$" instead\n\n$100\n^',
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
                            expect(result.value.parsed).toBe(match);
                            expect(source.slice(result.value.index)).toBe(
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
                            expect(result.value.parsed).toBe(Number(match));
                            expect(source.slice(result.value.index)).toBe(
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
                [
                    "bob",
                    'Error at (line: 1, column: 1)\nExpected a number but got "b" instead\n\nbob\n^',
                ],
                [
                    ".14159",
                    'Error at (line: 1, column: 1)\nExpected a number but got "." instead\n\n.14159\n^',
                ],
                [
                    "+hello",
                    'Error at (line: 1, column: 1)\nExpected a number but got "+" instead\n\n+hello\n^',
                ],
            ];

            test.each(errCases)(
                "Does not parse '%s' as a string",
                (source, errMessage) => {
                    const result = numberString().parse(source);

                    switch (result.variant) {
                        case Result.Variant.Err:
                            expect(result.error.message).toBe(errMessage);
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
                            expect(result.error.message).toBe(errMessage);
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
                        expect(result.value.parsed).toBe(12345);
                        expect(source.slice(result.value.index)).toBe(" hello");
                        break;

                    case Result.Variant.Err:
                        fail(result.error);
                }

                result = int().parse("123.1415 hello");
                switch (result.variant) {
                    case Result.Variant.Err:
                        expect(result.error.message).toBe(
                            'Error at (line: 1, column: 1)\nExpected an integer but got "123.1415" instead\n\n123.1415 h\n^',
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
                        expect(result.value.parsed).toBe("123");
                        expect(source.slice(result.value.index)).toBe(
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
                    expect(result.value.parsed).toEqual(["yes,", " "]);
                    expect(source.slice(result.value.index)).toBe("and");
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
                    expect(result.error.message).toBe(
                        `Error at (line: 1, column: 4)\nExpected "d" but got "f" instead\n\nabcfg\n   ^`,
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
                        expect(result.value.parsed).toEqual(matches);
                        expect(source.slice(result.value.index)).toBe(
                            remaining,
                        );
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
                        expect(result.value.parsed).toEqual(matches);
                        expect(source.slice(result.value.index)).toBe(
                            remaining,
                        );
                        break;

                    case Result.Variant.Err:
                        fail(result.error);
                }
            },
        );

        const errCases: Array<[string, string, Parser<any>]> = [
            [
                "bbbbb",
                'Error at (line: 1, column: 1)\nExpected "a" but got "b" instead\n\nbbbbb\n^',
                Parser.exact("a"),
            ],
        ];

        test.each(errCases)(
            "Doesn't match one or more times",
            (source, errMessage, parser) => {
                const result = oneOrMore(parser).parse(source);

                switch (result.variant) {
                    case Result.Variant.Err:
                        expect(result.error.message).toBe(errMessage);
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
                    expect(result.error.message).toBe("No parsers provided");
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
                    expect(result.value.parsed).toEqual("a");
                    expect(source.slice(result.value.index)).toBe("bc");
                    break;

                case Result.Variant.Err:
                    fail(result.error);
            }

            source = "bcd";
            result = parser.parse(source);

            switch (result.variant) {
                case Result.Variant.Err:
                    expect(result.error.message).toBe(
                        'Error at (line: 1, column: 1)\nExpected "a" but got "b" instead\n\nbcd\n^',
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
                    expect(result.value.parsed).toEqual("a");
                    expect(source.slice(result.value.index)).toBe("bc");
                    break;

                case Result.Variant.Err:
                    fail(result.error);
            }

            source = "bca";
            result = parser.parse(source);

            switch (result.variant) {
                case Result.Variant.Ok:
                    expect(result.value.parsed).toEqual("b");
                    expect(source.slice(result.value.index)).toBe("ca");
                    break;

                case Result.Variant.Err:
                    fail(result.error);
            }

            source = "cab";
            result = parser.parse(source);

            switch (result.variant) {
                case Result.Variant.Ok:
                    expect(result.value.parsed).toEqual("c");
                    expect(source.slice(result.value.index)).toBe("ab");
                    break;

                case Result.Variant.Err:
                    fail(result.error);
            }

            source = "f";
            result = parser.parse(source);

            switch (result.variant) {
                case Result.Variant.Err:
                    expect(result.error.message).toBe(
                        'Error at (line: 1, column: 1)\nExpected "c" but got "f" instead\n\nf\n^',
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
                    expect(result.value.parsed).toEqual("longer");
                    expect(source.slice(result.value.index)).toBe(" matches");
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
                    expect(result.value.parsed).toEqual("short");
                    expect(source.slice(result.value.index)).toBe("er matches");
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
                    expect(result.value.parsed).toEqual("anything");
                    expect(source.slice(result.value.index)).toBe("");
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
                    expect(result.value.parsed).toEqual({
                        key: "annotation",
                        match: "anything",
                    });
                    expect(source.slice(result.value.index)).toBe("");
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
                    expect(result.value.parsed).toEqual(["123", "abc"]);
                    expect(source.slice(result.value.index)).toBe("");
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
                    expect(result.value.parsed).toEqual("default");
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
                        expect(result.value.parsed).toEqual(matches);
                        break;

                    case Result.Variant.Err:
                        fail(result.error);
                }
            });

            const errCases: Array<[string, string]> = [
                [
                    "(-blah",
                    'Error at (line: 1, column: 2)\nExpected "blah" but got "-bla" instead\n\n(-blah\n ^',
                ],
                [
                    "(-ablah",
                    'Error at (line: 1, column: 2)\nExpected "blah" but got "-abl" instead\n\n(-ablah\n ^',
                ],
                [
                    "(-cblah",
                    'Error at (line: 1, column: 2)\nExpected "blah" but got "-cbl" instead\n\n(-cblah\n ^',
                ],
            ];

            test.each(errCases)(
                "Does not parse, as expected",
                (source, errMessage) => {
                    const result = parser.parse(source);
                    switch (result.variant) {
                        case Result.Variant.Err:
                            expect(result.error.message).toEqual(errMessage);
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
                    if (Maybe.isJust(result.value.parsed)) {
                        fail("Should not have parsed");
                    }
                    expect(Maybe.isNothing(result.value.parsed));
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
                            expect(result.value.parsed).toEqual(matches);
                            break;

                        case Result.Variant.Err:
                            fail(result.error);
                    }
                },
            );
        });

        describe("with 'sequence', 'oneOf', and 'map'", () => {
            const parser: Parser<[string, string] | [string, string, string]> =
                Parser.map(
                    ([a, maybeBOrC, d]) =>
                        Maybe.isJust(maybeBOrC)
                            ? [a, maybeBOrC.value, d]
                            : [a, d],

                    Parser.sequence(
                        Parser.exact("a"),
                        maybe(
                            Parser.oneOf(Parser.exact("b"), Parser.exact("c")),
                        ),
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
                        expect(result.value.parsed).toEqual(matches);
                        break;

                    case Result.Variant.Err:
                        fail(result.error);
                }
            });

            const errCases: Array<[string, string]> = [
                [
                    "abcd",
                    'Error at (line: 1, column: 3)\nExpected "d" but got "c" instead\n\nabcd\n  ^',
                ],
            ];

            test.each(errCases)("does not parse %s", (source, errMessage) => {
                const result = parser.parse(source);

                switch (result.variant) {
                    case Result.Variant.Err:
                        expect(result.error.message).toBe(errMessage);
                        break;

                    case Result.Variant.Ok:
                        fail("Should not have parsed");
                }
            });
        });
    });
});
