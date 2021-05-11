import { Result } from "../src/Result";
import { Parser } from "../src/Parser";

const {
    integerPart,
    alphaNum,
    map,
    oneOf,
    exact,
    pratt,
    toBinaryOperator,
    toUnaryOperator,
} = Parser;

describe("Pratt parser features", () => {
    const left = integerPart();
    const infix = oneOf(
        toBinaryOperator(exact("-"), [1, 2]),
        toBinaryOperator(exact("/"), [3, 4]),
    );
    const prefix = toUnaryOperator(exact("+"), 5);
    const postfix = toUnaryOperator(exact("!"), 7);
    const scopeBegin = exact("{");
    const scopeEnd = exact("}");

    describe("as S Expressions", () => {
        const exprParser = pratt<string>(left, {
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
                        expect(result.value[0]).toBe(expectedValue);
                        break;

                    case Result.Variant.Err:
                        fail(result.error);
                }
            },
        );
    });
});

describe("Pratt parser type features", () => {
    type MyInfix = "and" | "or";
    type MyPrefix = "not";
    const left = alphaNum();
    const infix = oneOf(
        toBinaryOperator(
            map<string, MyInfix>(() => "or", exact("or")),
            [1, 2],
        ),
        toBinaryOperator(
            map<string, MyInfix>(() => "and", exact("and")),
            [3, 4],
        ),
    );
    const prefix = toUnaryOperator(
        map<string, MyPrefix>(() => "not", exact("not")),
        5,
    );
    const scopeBegin = exact("(");
    const scopeEnd = exact(")");

    type AstNode =
        | string
        | {
              symbol: MyInfix;
              left: AstNode;
              right: AstNode;
          }
        | {
              symbol: MyPrefix;
              right: AstNode;
          };

    describe("As typed AST nodes", () => {
        const exprParser = pratt<string, AstNode, MyInfix, MyPrefix>(left, {
            infix: {
                op: infix,
                acc: (symbol, left, right) => ({
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
            ["nice and cool", { symbol: "and", left: "nice", right: "cool" }],
            [
                "nice and cool and wow",
                {
                    symbol: "and",
                    left: {
                        symbol: "and",
                        left: "nice",
                        right: "cool",
                    },
                    right: "wow",
                },
            ],
            [
                "nice or cool and wow",
                {
                    symbol: "or",
                    left: "nice",
                    right: {
                        symbol: "and",
                        left: "cool",
                        right: "wow",
                    },
                },
            ],
            [
                "not cool",
                {
                    symbol: "not",
                    right: "cool",
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
                            right: "cool",
                        },
                    },
                },
            ],
            [
                "not nice and cool",
                {
                    symbol: "and",
                    left: { symbol: "not", right: "nice" },
                    right: "cool",
                },
            ],
            [
                "not (nice) and cool",
                {
                    symbol: "and",
                    left: { symbol: "not", right: "nice" },
                    right: "cool",
                },
            ],
            [
                "not nice and (cool)",
                {
                    symbol: "and",
                    left: { symbol: "not", right: "nice" },
                    right: "cool",
                },
            ],
            [
                "(not nice) and cool",
                {
                    symbol: "and",
                    left: { symbol: "not", right: "nice" },
                    right: "cool",
                },
            ],
            [
                "not (nice and cool)",
                {
                    symbol: "not",

                    right: {
                        symbol: "and",

                        left: "nice",
                        right: "cool",
                    },
                },
            ],
        ];

        test.each(okCases)("parses '%s'", (source, expectedValue) => {
            let result = exprParser.parse(source);
            switch (result.variant) {
                case Result.Variant.Ok:
                    expect(result.value[0]).toEqual(expectedValue);
                    break;

                case Result.Variant.Err:
                    fail(result.error);
            }
        });

        const errCases: Array<[string, string]> = [
            [
                "(not) nice and cool",
                'Expected alpha numeric characters but got ")" instead',
            ],
            [
                "not (nice and) cool",
                'Expected alpha numeric characters but got ")" instead',
            ],
            ["not nice (and) cool", 'Expected "and" but got'],
            ["not nice (and cool)", 'Expected "and" but got'],
        ];

        test.each(errCases)("does not parse '%s'", (source, expectedValue) => {
            let result = exprParser.parse(source);
            switch (result.variant) {
                case Result.Variant.Err:
                    expect(result.error).toMatch(expectedValue);
                    break;

                case Result.Variant.Ok:
                    fail("Should not have parsed");
            }
        });
    });
});
