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
