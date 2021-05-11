import { Maybe } from "../src/Maybe";
import { Result } from "../src/Result";
import { Parser } from "../src/Parser";

const {
    map,
    sequence,
    lazy,
    spaces,
    maybe,
    exact,
    oneOf,
    int,
    toBinaryOperator,
    toUnaryOperator,
    pratt,
} = Parser;

describe("Right Recursive", () => {
    const exprParser: Parser<number> = map(
        ([term, , maybeRight]) => {
            switch (maybeRight.variant) {
                case Maybe.Variant.Nothing:
                    return term;

                case Maybe.Variant.Just:
                    const [, , expr] = maybeRight.value;
                    return term - expr;
            }
        },

        sequence(
            lazy(() => termParser),
            spaces(),
            maybe(
                sequence(
                    oneOf(exact("+"), exact("-")),
                    spaces(),
                    lazy(() => exprParser),
                ),
            ),
        ),
    );

    const termParser: Parser<number> = map(
        ([factor, , maybeRight]) => {
            switch (maybeRight.variant) {
                case Maybe.Variant.Nothing:
                    return factor;

                case Maybe.Variant.Just:
                    const [, , term] = maybeRight.value;
                    return factor / term;
            }
        },

        sequence(
            lazy(() => factorParser),
            spaces(),
            maybe(
                sequence(
                    oneOf(exact("*"), exact("/")),
                    spaces(),
                    lazy(() => termParser),
                ),
            ),
        ),
    );

    const factorParser: Parser<number> = oneOf(
        int(),
        map(
            ([, , expr]) => expr,
            sequence(
                exact("("),
                spaces(),
                lazy(() => exprParser),
                spaces(),
                exact(")"),
            ),
        ),
    );

    const okCases: Array<[string, number]> = [
        ["1 - 2 - 3 - 4", 1 - (2 - (3 - 4))],
        ["1 / 2 / 3 / 4", 1 / (2 / (3 / 4))],
    ];

    test.each(okCases)(
        "associates operators in '%s' to the right",
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

describe("Right Recursive Pratt", () => {
    const left = int();
    const infix = oneOf(
        toBinaryOperator(exact("-"), [2, 1]),
        toBinaryOperator(exact("/"), [4, 3]),
    );

    describe("compute results", () => {
        const exprParser = pratt(left, {
            infix: {
                op: infix,
                map: (symbol, left, right) =>
                    symbol === "-" ? left - right : left / right,
            },
        });

        const okCases: Array<[string, number]> = [
            ["1 - 2 - 3 - 4", 1 - (2 - (3 - 4))],
            ["1 / 2 / 3 / 4", 1 / (2 / (3 / 4))],
        ];

        test.each(okCases)(
            "associates operators in '%s' to the right",
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

    describe("as S Expressions", () => {
        const exprParser = pratt<number, string>(left, {
            infix: {
                op: infix,
                map: (symbol, left, right) => `(${symbol} ${left} ${right})`,
            },
        });

        const okCases: Array<[string, string]> = [
            ["1 - 2 - 3 - 4", "(- 1 (- 2 (- 3 4)))"],
            ["1 / 2 / 3 / 4", "(/ 1 (/ 2 (/ 3 4)))"],
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

describe("Left Recursive Pratt", () => {
    const left = int();
    const infix = oneOf(
        toBinaryOperator(exact("-"), [1, 2]),
        toBinaryOperator(exact("/"), [3, 4]),
    );

    describe("compute results", () => {
        const exprParser = pratt(left, {
            infix: {
                op: infix,
                map: (symbol, left, right) =>
                    symbol === "-" ? left - right : left / right,
            },
        });

        const okCases: Array<[string, number]> = [
            ["1 - 2 - 3 - 4", 1 - 2 - 3 - 4],
            ["1 / 2 / 3 / 4", 1 / 2 / 3 / 4],
        ];

        test.each(okCases)(
            "associates operators in '%s' to the left",
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

    describe("as S Expressions", () => {
        const exprParser = pratt<number, string>(left, {
            infix: {
                op: infix,
                map: (symbol, left, right) => `(${symbol} ${left} ${right})`,
            },
        });

        const okCases: Array<[string, string]> = [
            ["1 - 2 - 3 - 4", "(- (- (- 1 2) 3) 4)"],
            ["1 / 2 / 3 / 4", "(/ (/ (/ 1 2) 3) 4)"],
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

describe("Left Recursive Pratt With Pre and Postfix", () => {
    const left = int();
    const infix = oneOf(
        toBinaryOperator(exact("-"), [1, 2]),
        toBinaryOperator(exact("/"), [3, 4]),
    );
    const prefix = toUnaryOperator(exact("+"), 5);
    const postfix = toUnaryOperator(exact("!"), 7);
    const scopeBegin = exact("{");
    const scopeEnd = exact("}");

    describe("as S Expressions", () => {
        const exprParser = pratt<number, string>(left, {
            infix: {
                op: infix,
                map: (symbol, left, right) => `(${symbol} ${left} ${right})`,
            },
            prefix: {
                op: prefix,
                map: (symbol, right) => `(${symbol} ${right})`,
            },
            postfix: {
                op: postfix,
                map: (symbol, left) => `(${symbol} ${left})`,
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
            ["1", 1],
            ["{1}", 1],
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
