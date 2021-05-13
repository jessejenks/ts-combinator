import { Maybe } from "../src/Maybe";
import { Result } from "../src/Result";
import { Parser } from "../src/Parser";

const { sequence, map, oneOf, exact, spaces, int, maybe, optional, lazy } =
    Parser;

describe("parses canonical context free grammar of balanced parentheses", () => {
    /**
     * The canonical example of a context free language which is not regular is given by the grammar
     * > S -> SS | (S) | ''
     *
     * However, this is ambiguous
     * Instead, we can use the equivalent unambiguous grammar
     *
     * > S -> (S)S | ''
     *
     * Note: This is very slow since it is a fairly extreme example
     */
    const parens: Parser<string[]> = optional(
        map(
            ([lparen, seqA, rparen, seqB]) => [
                lparen,
                ...seqA,
                rparen,
                ...seqB,
            ],
            sequence(
                exact("("),
                lazy(() => parens),
                exact(")"),
                lazy(() => parens),
            ),
        ),
        [],
    );

    const okCases: Array<[string, string[]]> = [
        ["", []],
        ["()", ["(", ")"]],
        ["(())", ["(", "(", ")", ")"]],
        ["(())()", ["(", "(", ")", ")", "(", ")"]],
    ];

    test.each(okCases)("Parses '%s'", (source, matches) => {
        const result = parens.parse(source);

        switch (result.variant) {
            case Result.Variant.Ok:
                expect(result.value.parsed).toEqual(matches);
                break;

            case Result.Variant.Err:
                fail(result.error);
        }
    });
});

/*
 *   Original Grammar
 *   E -> E + T | T
 *   T -> T * F | F
 *   F -> int | ( E )
 *
 *   Swapped to avoid left recursion
 *
 *   E -> T | T + E
 *   T -> F | F * T
 *   F -> int | ( E )
 */

describe("parses and interprets right-recursive arithmetic language", () => {
    const exprParser: Parser<number> = map(
        ([term, , maybeRight]) => {
            switch (maybeRight.variant) {
                case Maybe.Variant.Nothing:
                    return term;

                case Maybe.Variant.Just:
                    const [, , expr] = maybeRight.value;
                    return term + expr;
            }
        },

        sequence(
            lazy(() => termParser),
            spaces(),
            maybe(
                sequence(
                    exact("+"),
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
                    return factor * term;
            }
        },

        sequence(
            lazy(() => factorParser),
            spaces(),
            maybe(
                sequence(
                    exact("*"),
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
        ["1", 1],
        ["1 + 2", 3],
        ["1 + 2 + 3", 6],
        ["(1 + 2) + 3", 6],
        ["1 + 2 * 3 + 4", 11],
        ["(1 + 2) * 3 + 4", 13],
    ];

    test.each(okCases)(
        "parses '%s' and interprets to %d",
        (source, expected) => {
            const result = exprParser.parse(source);

            switch (result.variant) {
                case Result.Variant.Ok:
                    expect(result.value.parsed).toBe(expected);
                    break;

                case Result.Variant.Err:
                    fail(result.error);
            }
        },
    );
});

describe("parses right-recursive arithmetic language to typed AST", () => {
    type Expr = {
        kind: "EXPR";
        value: Term | Add;
    };

    const Expr = (value: Term | Add): Expr => ({
        kind: "EXPR",
        value,
    });

    type Term = {
        kind: "TERM";
        value: Factor | Mult;
    };

    const Term = (value: Factor | Mult): Term => ({
        kind: "TERM",
        value,
    });

    type Factor = {
        kind: "FACTOR";
        value: Int | Expr;
    };

    const Factor = (value: Int | Expr): Factor => ({
        kind: "FACTOR",
        value,
    });

    type Add = {
        kind: "ADD";
        left: Factor | Mult;
        right: Term | Add;
    };

    const Add = (left: Factor | Mult, right: Term | Add): Add => ({
        kind: "ADD",
        left,
        right,
    });

    type Mult = {
        kind: "MULT";
        left: Expr | Int;
        right: Factor | Mult;
    };

    const Mult = (left: Expr | Int, right: Factor | Mult): Mult => ({
        kind: "MULT",
        left,
        right,
    });

    type Int = {
        kind: "INTEGER";
        value: number;
    };

    const Int = (value: number): Int => ({
        kind: "INTEGER",
        value,
    });

    const exprParser: Parser<Term | Add> = map(
        ([term, , maybeRight]) => {
            switch (maybeRight.variant) {
                case Maybe.Variant.Nothing:
                    return Term(term);

                case Maybe.Variant.Just:
                    const [, , expr] = maybeRight.value;
                    return Add(term, expr);
            }
        },

        sequence(
            lazy(() => termParser),
            spaces(),
            maybe(
                sequence(
                    exact("+"),
                    spaces(),
                    lazy(() => exprParser),
                ),
            ),
        ),
    );

    const termParser: Parser<Factor | Mult> = map(
        ([factor, , maybeRight]) => {
            switch (maybeRight.variant) {
                case Maybe.Variant.Nothing:
                    return Factor(factor);

                case Maybe.Variant.Just:
                    const [, , term] = maybeRight.value;
                    return Mult(factor, term);
            }
        },

        sequence(
            lazy(() => factorParser),
            spaces(),
            maybe(
                sequence(
                    exact("*"),
                    spaces(),
                    lazy(() => termParser),
                ),
            ),
        ),
    );

    const factorParser: Parser<Int | Expr> = oneOf<Int | Expr>(
        map(Int, int()),
        map(
            ([, , expr]) => Expr(expr),
            sequence(
                exact("("),
                spaces(),
                lazy(() => exprParser),
                spaces(),
                exact(")"),
            ),
        ),
    );

    const okCases: Array<[string, Term | Add]> = [
        ["1", Term(Factor(Int(1)))],
        ["1 + 2", Add(Factor(Int(1)), Term(Factor(Int(2))))],
        [
            "1 + 2 + 3",
            Add(Factor(Int(1)), Add(Factor(Int(2)), Term(Factor(Int(3))))),
        ],
        [
            "(1 + 2) + 3",
            Add(
                Factor(Expr(Add(Factor(Int(1)), Term(Factor(Int(2)))))),
                Term(Factor(Int(3))),
            ),
        ],
    ];

    test.each(okCases)(
        "parses '%s' to right associative typed AST",
        (source, expected) => {
            const result = exprParser.parse(source);

            switch (result.variant) {
                case Result.Variant.Ok:
                    expect(result.value.parsed).toEqual(expected);
                    break;

                case Result.Variant.Err:
                    fail(result.error);
            }
        },
    );
});
