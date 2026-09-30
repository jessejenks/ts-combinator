import { Result } from "../src/Result";
import { Parser } from "../src/Parser";

const {
    map,
    exact,
    sequence,
    oneOf,
    oneOrMore,
    optional,
    lazy,
    succeed,
    fail,
    conditional,
    end,
} = Parser;

/**
 * !p succeeds only if p fails without consuming anything
 */
const not = <T>(parser: Parser<T>): Parser<null> =>
    oneOf(
        map(() => null, conditional(oneOf(parser), fail())),
        succeed(null),
    );

/**
 * &p succeeds only if p succeeds without consuming anything
 */
const and = <T>(parser: Parser<T>): Parser<null> => not(not(parser));

describe("lookahead predicates", () => {
    const okCases: Array<[string, string, number, Parser<unknown>]> = [
        ["!b a", "a", 1, sequence(not(exact("b")), exact("a"))],
        ["&ab a", "ab", 1, sequence(and(exact("ab")), exact("a"))],
    ];

    test.each(okCases)(
        "'%s' parses '%s' and ends at index %d",
        (_, source, index, parser) => {
            const result = parser.parse(source);
            switch (result.variant) {
                case Result.Variant.Ok:
                    expect(result.value.index).toBe(index);
                    break;

                case Result.Variant.Err:
                    throw new Error(result.error.message);
            }
        },
    );

    const errCases: Array<[string, string, Parser<unknown>]> = [
        ["!a a", "a", sequence(not(exact("a")), exact("a"))],
        ["&ab a", "ac", sequence(and(exact("ab")), exact("a"))],
    ];

    test.each(errCases)("'%s' does not parse '%s'", (_, source, parser) => {
        const result = parser.parse(source);
        switch (result.variant) {
            case Result.Variant.Err:
                break;

            case Result.Variant.Ok:
                console.log(result);
                throw new Error("Should not have parsed");
        }
    });
});

describe("parses canonical context sensitive language a^n b^n c^n", () => {
    /**
     * The canonical example of a language which is not context free is
     * > a^n b^n c^n, n >= 1
     *
     * No context free grammar can check that all three counts match. But with
     * lookahead we can check two context free conditions at the same position.
     *
     * > S -> &(A !b) a+ B end
     * > A -> a A? b
     * > B -> b B? c
     *
     * `&(A !b)` checks that the number of a's matches the number of b's without
     * consuming anything. Then `a+ B` checks that the number of b's matches the
     * number of c's.
     */
    const aThenB: Parser<null> = map(
        () => null,
        sequence(
            exact("a"),
            optional(
                lazy(() => aThenB),
                null,
            ),
            exact("b"),
        ),
    );

    const bThenC: Parser<null> = map(
        () => null,
        sequence(
            exact("b"),
            optional(
                lazy(() => bThenC),
                null,
            ),
            exact("c"),
        ),
    );

    const parser: Parser<number> = map(
        ([, as]) => as.length,
        sequence(
            and(sequence(aThenB, not(exact("b")))),
            oneOrMore(exact("a")),
            bThenC,
            end(),
        ),
    );

    const okCases: Array<[string, number]> = [
        ["abc", 1],
        ["aabbcc", 2],
        ["aaabbbccc", 3],
        ["aaaaaaabbbbbbbccccccc", 7],
    ];

    test.each(okCases)("Parses '%s' with n = %d", (source, n) => {
        const result = parser.parse(source);
        switch (result.variant) {
            case Result.Variant.Ok:
                expect(result.value.parsed).toBe(n);
                break;

            case Result.Variant.Err:
                throw new Error(result.error.message);
        }
    });

    const errCases: Array<string> = [
        "",
        "ab",
        "aabbc",
        "aabcc",
        "abbcc",
        "aabbbcc",
        "aabbccc",
        "abcabc",
    ];

    test.each(errCases)("Does not parse '%s'", (source) => {
        const result = parser.parse(source);
        switch (result.variant) {
            case Result.Variant.Err:
                break;

            case Result.Variant.Ok:
                console.log(result);
                throw new Error("Should not have parsed");
        }
    });
});
