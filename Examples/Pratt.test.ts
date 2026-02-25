import { Result } from "../src/Result";
import { Parser } from "../src/Parser";

const {
    spaces,
    integerPart,
    alphaNum,
    oneOf,
    exact,
    map,
    sequence,
    pratt,
    toBinaryOperator,
    toUnaryOperator,
} = Parser;

describe("Pratt parser features", () => {
    describe("trivial parser", () => {
        const trivial = pratt({ left: { parser: exact("hello") } });
        test("trivial", () => {
            const result = trivial.parse("hello world");
            switch (result.variant) {
                case Result.Variant.Ok:
                    expect(result.value.parsed).toBe("hello");
                    break;

                case Result.Variant.Err:
                    throw new Error(result.error.message);
            }
        });
    });

    describe("prefix only parser", () => {
        const left = integerPart();
        const prefix = toUnaryOperator(exact("+"), 1);

        const prefixParser = pratt({
            left: { parser: left },
            prefix: {
                op: prefix,
                acc: (symbol, right) => `(${symbol} ${right})`,
            },
        });

        const okCases: Array<[string, string]> = [
            ["123", "123"],
            ["+123", "(+ 123)"],
            ["+   123", "(+ 123)"],
            ["+++123", "(+ (+ (+ 123)))"],
        ];

        test.each(okCases)(
            "parses '%s' as the string '%s'",
            (source, expectedValue) => {
                const result = prefixParser.parse(source);
                switch (result.variant) {
                    case Result.Variant.Ok:
                        expect(result.value.parsed).toBe(expectedValue);
                        break;

                    case Result.Variant.Err:
                        throw new Error(result.error.message);
                }
            },
        );
    });

    describe("postfix only parser", () => {
        const left = integerPart();
        const postfix = toUnaryOperator(exact("!"), 1);

        const postfixParser = pratt({
            left: { parser: left },
            postfix: {
                op: postfix,
                acc: (symbol, right) => `(${symbol} ${right})`,
            },
        });

        const okCases: Array<[string, string]> = [
            ["123", "123"],
            ["123!", "(! 123)"],
            ["123   !", "(! 123)"],
            ["123!!!", "(! (! (! 123)))"],
        ];

        test.each(okCases)(
            "parses '%s' as the string '%s'",
            (source, expectedValue) => {
                const result = postfixParser.parse(source);
                switch (result.variant) {
                    case Result.Variant.Ok:
                        expect(result.value.parsed).toBe(expectedValue);
                        break;

                    case Result.Variant.Err:
                        throw new Error(result.error.message);
                }
            },
        );
    });

    describe("prefix/postfix/scope parser", () => {
        const left = integerPart();
        const prefix = toUnaryOperator(exact("+"), 5);
        const postfix = toUnaryOperator(exact("!"), 7);
        const scopeBegin = exact("(");
        const scopeEnd = exact(")");

        const postfixParser = pratt({
            left: {
                parser: left,
            },
            prefix: {
                op: prefix,
                acc: (symbol, right) => `(${symbol} ${right})`,
            },
            postfix: {
                op: postfix,
                acc: (symbol, right) => `(${symbol} ${right})`,
            },
            scope: {
                scopeBegin,
                scopeEnd,
            },
        });

        const okCases: Array<[string, string]> = [
            ["123", "123"],
            ["+123", "(+ 123)"],
            ["+123!", "(+ (! 123))"],
            ["++123!!", "(+ (+ (! (! 123))))"],
            ["+(+123)!!", "(+ (! (! (+ 123))))"],
        ];

        test.each(okCases)(
            "parses '%s' as the string '%s'",
            (source, expectedValue) => {
                const result = postfixParser.parse(source);
                switch (result.variant) {
                    case Result.Variant.Ok:
                        expect(result.value.parsed).toBe(expectedValue);
                        break;

                    case Result.Variant.Err:
                        throw new Error(result.error.message);
                }
            },
        );
    });

    describe("as S Expressions", () => {
        const left = integerPart();
        const infix = oneOf(
            toBinaryOperator(exact("-"), [1, 2]),
            toBinaryOperator(exact("/"), [3, 4]),
        );
        const prefix = toUnaryOperator(exact("+"), 5);
        const postfix = toUnaryOperator(exact("!"), 7);
        const scopeBegin = exact("{");
        const scopeEnd = exact("}");

        const exprParser = pratt({
            left: { parser: left },
            infix: {
                op: infix,
                acc: (symbol, left, right) => `(${symbol} ${left} ${right})`,
            },
            prefix: {
                op: prefix,
                acc: (symbol, right) => `(${symbol} ${right})`,
            },
            postfix: {
                op: postfix,
                acc: (symbol, left) => `(${symbol} ${left})`,
            },
            scope: {
                scopeBegin,
                scopeEnd,
            },
        });

        const okCases: Array<[string, string | number]> = [
            ["1 - 2 - 3 - 4", "(- (- (- 1 2) 3) 4)"],
            ["1 / 2 / 3 / 4", "(/ (/ (/ 1 2) 3) 4)"],
            ["+3", "(+ 3)"],
            ["3!", "(! 3)"],
            ["++3", "(+ (+ 3))"],
            ["3!!", "(! (! 3))"],
            ["3!!!!", "(! (! (! (! 3))))"],
            ["++++3", "(+ (+ (+ (+ 3))))"],
            ["+3!", "(+ (! 3))"], // "!" has higher binding power / precedence than "+"
            ["++3!!", "(+ (+ (! (! 3))))"],
            ["1 / 2 / +3", "(/ (/ 1 2) (+ 3))"],
            ["1 / 2 / +3 / 4", "(/ (/ (/ 1 2) (+ 3)) 4)"],
            ["1 / 2 / +3 / + 4", "(/ (/ (/ 1 2) (+ 3)) (+ 4))"],
            ["1 / 2 / 3! / + 4", "(/ (/ (/ 1 2) (! 3)) (+ 4))"],
            ["1 / 2 / +3! / + 4", "(/ (/ (/ 1 2) (+ (! 3))) (+ 4))"],
            ["1", "1"],
            ["{1}", "1"],
            ["{+1}", "(+ 1)"],
            ["{1!}", "(! 1)"],
            ["{+1}!", "(! (+ 1))"],
            ["+{+3}!!", "(+ (! (! (+ 3))))"],
            ["{1 / 2}", "(/ 1 2)"],
            ["1 / {2 / 3}", "(/ 1 (/ 2 3))"],
            ["1 / {2 / 3} / 4", "(/ (/ 1 (/ 2 3)) 4)"],
            ["1 / {2 / 3 / 4}", "(/ 1 (/ (/ 2 3) 4))"],
        ];

        test.each(okCases)(
            "parses '%s' as the string '%s'",
            (source, expectedValue) => {
                let result = exprParser.parse(source);
                switch (result.variant) {
                    case Result.Variant.Ok:
                        expect(result.value.parsed).toBe(expectedValue);
                        break;

                    case Result.Variant.Err:
                        throw new Error(result.error.message);
                }
            },
        );
    });
});

describe("Pratt parser type features", () => {
    const left = alphaNum();
    const infix = oneOf(
        toBinaryOperator(exact("or"), [1, 2]),
        toBinaryOperator(exact("and"), [3, 4]),
    );
    const prefix = toUnaryOperator(exact("not"), 5);
    const scopeBegin = exact("(");
    const scopeEnd = exact(")");

    type AstNode =
        | { symbol: "ident"; name: string }
        | {
              symbol: "or" | "and";
              left: AstNode;
              right: AstNode;
          }
        | {
              symbol: "not";
              right: AstNode;
          };

    describe("As typed AST nodes", () => {
        const exprParser = pratt({
            left: {
                parser: map(
                    (name): AstNode => ({ symbol: "ident", name }),
                    left,
                ),
            },
            infix: {
                op: infix,
                acc: (symbol, left, right): AstNode => ({
                    symbol,
                    left,
                    right,
                }),
            },
            prefix: {
                op: prefix,
                acc: (symbol, right) => ({ symbol, right }),
            },
            scope: {
                scopeBegin,
                scopeEnd,
            },
        });

        const okCases: Array<[string, AstNode]> = [
            [
                "nice and cool",
                {
                    symbol: "and",
                    left: { symbol: "ident", name: "nice" },
                    right: { symbol: "ident", name: "cool" },
                },
            ],
            [
                "nice and cool and wow",
                {
                    symbol: "and",
                    left: {
                        symbol: "and",
                        left: { symbol: "ident", name: "nice" },
                        right: { symbol: "ident", name: "cool" },
                    },
                    right: { symbol: "ident", name: "wow" },
                },
            ],
            [
                "nice or cool and wow",
                {
                    symbol: "or",
                    left: { symbol: "ident", name: "nice" },
                    right: {
                        symbol: "and",
                        left: { symbol: "ident", name: "cool" },
                        right: { symbol: "ident", name: "wow" },
                    },
                },
            ],
            [
                "not cool",
                {
                    symbol: "not",
                    right: { symbol: "ident", name: "cool" },
                },
            ],
            [
                "not not not cool",
                {
                    symbol: "not",
                    right: {
                        symbol: "not",
                        right: {
                            symbol: "not",
                            right: { symbol: "ident", name: "cool" },
                        },
                    },
                },
            ],
            [
                "not nice and cool",
                {
                    symbol: "and",
                    left: {
                        symbol: "not",
                        right: { symbol: "ident", name: "nice" },
                    },
                    right: { symbol: "ident", name: "cool" },
                },
            ],
            [
                "not (nice) and cool",
                {
                    symbol: "and",
                    left: {
                        symbol: "not",
                        right: { symbol: "ident", name: "nice" },
                    },
                    right: { symbol: "ident", name: "cool" },
                },
            ],
            [
                "not nice and (cool)",
                {
                    symbol: "and",
                    left: {
                        symbol: "not",
                        right: { symbol: "ident", name: "nice" },
                    },
                    right: { symbol: "ident", name: "cool" },
                },
            ],
            [
                "(not nice) and cool",
                {
                    symbol: "and",
                    left: {
                        symbol: "not",
                        right: { symbol: "ident", name: "nice" },
                    },
                    right: { symbol: "ident", name: "cool" },
                },
            ],
            [
                "not (nice and cool)",
                {
                    symbol: "not",
                    right: {
                        symbol: "and",
                        left: { symbol: "ident", name: "nice" },
                        right: { symbol: "ident", name: "cool" },
                    },
                },
            ],
        ];

        test.each(okCases)("parses '%s'", (source, expectedValue) => {
            const result = exprParser.parse(source);
            switch (result.variant) {
                case Result.Variant.Ok:
                    expect(result.value.parsed).toEqual(expectedValue);
                    break;

                case Result.Variant.Err:
                    throw new Error(result.error.message);
            }
        });

        const partialCases: Array<[string, AstNode, string]> = [
            [
                "not nice (and) cool",
                {
                    symbol: "not",
                    right: { symbol: "ident", name: "nice" },
                },
                "(and) cool",
            ],
            [
                "not nice (and cool)",
                {
                    symbol: "not",
                    right: { symbol: "ident", name: "nice" },
                },
                "(and cool)",
            ],
        ];

        test.each(partialCases)(
            "partially parses '%s'",
            (source, expectedValue, remaining) => {
                const result = exprParser.parse(source);
                switch (result.variant) {
                    case Result.Variant.Ok:
                        expect(result.value.parsed).toEqual(expectedValue);
                        expect(
                            result.value.source.slice(result.value.index),
                        ).toEqual(remaining);
                        break;

                    case Result.Variant.Err:
                        throw new Error(result.error.message);
                }
            },
        );

        const errCases: Array<[string, string]> = [
            [
                "(not) nice and cool",
                'Expected alpha numeric characters but got ")" instead',
            ],
            [
                "not (nice and) cool",
                'Expected alpha numeric characters but got ")" instead',
            ],
        ];

        test.each(errCases)("does not parse '%s'", (source, expectedValue) => {
            let result = exprParser.parse(source);
            switch (result.variant) {
                case Result.Variant.Err:
                    expect(result.error.message).toMatch(expectedValue);
                    break;

                case Result.Variant.Ok:
                    expect(result.variant).toBe(Result.Variant.Err);
            }
        });
    });

    const { fromRegExp, zeroOrMore } = Parser;
    const lineComment = fromRegExp(/#[^\n]*\n?/, "line comment");
    const trivia = map(
        ([, cs]) => cs,
        sequence(
            spaces(),
            zeroOrMore(map(([, c]) => c, sequence(spaces(), lineComment))),
        ),
    );

    describe("With line comment handling", () => {
        const astParser = pratt({
            left: {
                parser: left,
                acc: (name): AstNode => ({
                    symbol: "ident",
                    name,
                }),
            },
            infix: {
                op: infix,
                acc: (symbol, left, right): AstNode => ({
                    symbol,
                    left,
                    right,
                }),
            },
            prefix: {
                op: prefix,
                acc: (symbol, right): AstNode => ({
                    symbol,
                    right,
                }),
            },
            scope: {
                scopeBegin,
                scopeEnd,
            },
            trailing: trivia,
        });

        const okCases: Array<[string, AstNode]> = [
            [
                "nice and cool",
                {
                    symbol: "and",
                    left: { symbol: "ident", name: "nice" },
                    right: { symbol: "ident", name: "cool" },
                },
            ],
            [
                "nice and cool and wow",
                {
                    symbol: "and",
                    left: {
                        symbol: "and",
                        left: { symbol: "ident", name: "nice" },
                        right: { symbol: "ident", name: "cool" },
                    },
                    right: { symbol: "ident", name: "wow" },
                },
            ],
            [
                "nice or cool and wow",
                {
                    symbol: "or",
                    left: { symbol: "ident", name: "nice" },
                    right: {
                        symbol: "and",
                        left: { symbol: "ident", name: "cool" },
                        right: { symbol: "ident", name: "wow" },
                    },
                },
            ],
            [
                "not cool",
                {
                    symbol: "not",
                    right: { symbol: "ident", name: "cool" },
                },
            ],
            [
                "not not not cool",
                {
                    symbol: "not",
                    right: {
                        symbol: "not",
                        right: {
                            symbol: "not",
                            right: { symbol: "ident", name: "cool" },
                        },
                    },
                },
            ],
            [
                "not nice and cool",
                {
                    symbol: "and",
                    left: {
                        symbol: "not",
                        right: { symbol: "ident", name: "nice" },
                    },
                    right: { symbol: "ident", name: "cool" },
                },
            ],
            [
                "not (nice) and cool",
                {
                    symbol: "and",
                    left: {
                        symbol: "not",
                        right: { symbol: "ident", name: "nice" },
                    },
                    right: { symbol: "ident", name: "cool" },
                },
            ],
            [
                "not nice and (cool)",
                {
                    symbol: "and",
                    left: {
                        symbol: "not",
                        right: { symbol: "ident", name: "nice" },
                    },
                    right: { symbol: "ident", name: "cool" },
                },
            ],
            [
                "(not nice) and cool",
                {
                    symbol: "and",
                    left: {
                        symbol: "not",
                        right: { symbol: "ident", name: "nice" },
                    },
                    right: { symbol: "ident", name: "cool" },
                },
            ],
            [
                "not (nice and cool)",
                {
                    symbol: "not",
                    right: {
                        symbol: "and",
                        left: { symbol: "ident", name: "nice" },
                        right: { symbol: "ident", name: "cool" },
                    },
                },
            ],
        ];

        test.each(okCases)("parses '%s'", (source, expectedValue) => {
            const result = astParser.parse(source);
            switch (result.variant) {
                case Result.Variant.Ok:
                    expect(result.value.parsed).toEqual(expectedValue);
                    break;

                case Result.Variant.Err:
                    throw new Error(result.error.message);
            }
        });

        const partialCases: Array<[string, AstNode, string]> = [
            [
                "not nice (and) cool",
                {
                    symbol: "not",
                    right: { symbol: "ident", name: "nice" },
                },
                "(and) cool",
            ],
            [
                "not nice (and cool)",
                {
                    symbol: "not",
                    right: { symbol: "ident", name: "nice" },
                },
                "(and cool)",
            ],
        ];

        test.each(partialCases)(
            "partially parses '%s'",
            (source, expectedValue, remaining) => {
                const result = astParser.parse(source);
                switch (result.variant) {
                    case Result.Variant.Ok:
                        expect(result.value.parsed).toEqual(expectedValue);
                        expect(
                            result.value.source.slice(result.value.index),
                        ).toEqual(remaining);
                        break;

                    case Result.Variant.Err:
                        throw new Error(result.error.message);
                }
            },
        );

        const errCases: Array<[string, string]> = [
            [
                "(not) nice and cool",
                'Expected alpha numeric characters but got ")" instead',
            ],
            [
                "not (nice and) cool",
                'Expected alpha numeric characters but got ")" instead',
            ],
        ];

        test.each(errCases)("does not parse '%s'", (source, expectedValue) => {
            let result = astParser.parse(source);
            switch (result.variant) {
                case Result.Variant.Err:
                    expect(result.error.message).toMatch(expectedValue);
                    break;

                case Result.Variant.Ok:
                    expect(result.variant).toBe(Result.Variant.Err);
            }
        });
    });

    describe("As typed CST nodes capturing comments", () => {
        type CstNode =
            | {
                  symbol: "ident";
                  name: string;
                  trailingComments: string[];
              }
            | {
                  symbol: "or" | "and";
                  left: CstNode;
                  right: CstNode;
                  trailingComments: string[];
              }
            | {
                  symbol: "not";
                  right: CstNode;
                  trailingComments: string[];
              }
            | {
                  symbol: "grouping";
                  leadingComments: string[];
                  node: CstNode;
                  trailingComments: string[];
              };

        const cstParser = pratt({
            left: {
                parser: left,
                acc: (name, trailingComments): CstNode => ({
                    symbol: "ident",
                    name,
                    trailingComments,
                }),
            },
            infix: {
                op: infix,
                acc: (symbol, left, right, trailingComments): CstNode => ({
                    symbol,
                    left,
                    right,
                    trailingComments,
                }),
            },
            prefix: {
                op: prefix,
                acc: (symbol, right, trailingComments): CstNode => ({
                    symbol,
                    right,
                    trailingComments,
                }),
            },
            scope: {
                scopeBegin,
                scopeEnd,
                acc: (
                    _b,
                    node,
                    _e,
                    leadingComments,
                    trailingComments,
                ): CstNode => ({
                    symbol: "grouping",
                    node,
                    leadingComments,
                    trailingComments,
                }),
            },
            trailing: trivia,
        });

        const fullParser = sequence(trivia, cstParser);

        const okCases: Array<[string, [string[], CstNode]]> = [
            [
                "nice and cool",
                [
                    [],
                    {
                        symbol: "and",
                        left: {
                            symbol: "ident",
                            name: "nice",
                            trailingComments: [],
                        },
                        trailingComments: [],
                        right: {
                            symbol: "ident",
                            name: "cool",
                            trailingComments: [],
                        },
                    },
                ],
            ],
            [
                [
                    "# leading comment 1",
                    "# leading comment 2",
                    "nice # trailing after nice 1",
                    "# trailing after nice 2",
                    "and # trailing after and 1",
                    "# trailing after and 2",
                    "cool # trailing after cool 1",
                    "# trailing after cool 2",
                ].join("\n"),
                [
                    ["# leading comment 1\n", "# leading comment 2\n"],
                    {
                        symbol: "and",
                        left: {
                            symbol: "ident",
                            name: "nice",
                            trailingComments: [
                                "# trailing after nice 1\n",
                                "# trailing after nice 2\n",
                            ],
                        },
                        trailingComments: [
                            "# trailing after and 1\n",
                            "# trailing after and 2\n",
                        ],
                        right: {
                            symbol: "ident",
                            name: "cool",
                            trailingComments: [
                                "# trailing after cool 1\n",
                                "# trailing after cool 2",
                            ],
                        },
                    },
                ],
            ],
        ];

        test.each(okCases)("parses '%s'", (source, expectedValue) => {
            const result = fullParser.parse(source);
            switch (result.variant) {
                case Result.Variant.Ok:
                    expect(result.value.parsed).toEqual(expectedValue);
                    break;

                case Result.Variant.Err:
                    throw new Error(result.error.message);
            }
        });
    });
});
