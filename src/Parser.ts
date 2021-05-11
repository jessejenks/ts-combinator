import { Maybe } from "./Maybe";
import { Result } from "./Result";

export type ParseSuccess<T> = {
    parsed: T;
    index: number;
    source: string;
};

export type ParseError = {
    message: string;
    readonly backtrackable: boolean;
};

/**
 * A wrapper on the `Result` type, and the return type of the `parse` method on any parser.
 * In the `Ok` case, `ParseResult` returns the parsed value, the current index, the original input.
 * In the `Err` case returns an error message as a string.
 *
 * @example
 * ```ts
 * const result: ParseResult<string> = exact("hello").parse("hellorest of input");
 * // Result.Ok<[string, number, string]>(["hello", 5, "hellorest of input"])
 * ```
 */
export type ParseResult<T> = Result<ParseSuccess<T>, ParseError>;

export function ParseSuccess<T>(
    parsed: T,
    index: number,
    source: string,
): Result.Ok<ParseSuccess<T>> {
    return Result.Ok({ parsed, index, source });
}

export function ParseError(
    message: string,
    backtrackable: boolean = true,
): Result.Err<ParseError> {
    return Result.Err({ message, backtrackable });
}

/**
 * The main `Parser` type.
 *
 * Wraps a function which takes a source string, and returns a {@link ParseResult}.
 *
 * See the {@link Parser} namespace for available parser combinators
 *
 * @see ParseResult
 */
export type Parser<T> = {
    parse: (source: string, index?: number) => ParseResult<T>;
};

/**
 * The Parser namespace
 *
 * Contains all predefined parser combinators
 */
export namespace Parser {
    /**
     * Creates a new `Parser`.
     *
     * Accepts a function which takes a source string, and returns a {@link ParseResult}.
     *
     * @see ParseResult
     */
    export function Parser<T>(
        parse: (source: string, index?: number) => ParseResult<T>,
    ): Parser<T> {
        return { parse };
    }

    /**
     *
     * @param toMatch the exact string to match
     */
    export const exact = (toMatch: string): Parser<string> =>
        Parser<string>((source: string, index: number = 0) => {
            if (source.slice(index, index + toMatch.length) === toMatch) {
                return ParseSuccess(toMatch, index + toMatch.length, source);
            }
            const [location, context] = getErrorMessageContext(source, index);
            return ParseError(
                `${location}\nExpected "${toMatch}" but got "${source.slice(
                    index,
                    index + toMatch.length,
                )}" instead\n\n${context}`,
            );
        });

    /**
     * A parser which always succeeds with a given value.
     * Primarily useful for providing a default value. For example in the {@link optional} combinator.
     *
     * @param value The value to succeed with
     *
     * @example
     * ```ts
     * oneOf(exact("a"), exact("b"), succeed("default")).parse("c")
     * // consumed no characters, but succeeded with default value
     * // Result.Ok(["default", "c"])
     * ```
     */
    export const succeed = <T>(value: T): Parser<T> =>
        Parser<T>((source: string, index: number = 0) =>
            ParseSuccess(value, index, source),
        );

    /**
     * A parser which always fails with a given error message.
     * Useful as a default value for an optional parser.
     *
     * @param err the error message to fail with
     *
     * @example
     * ```ts
     * function optionalArgument<T>(optionalParser: Parser<T> = fail<T>()) {
     *     const result = optionalParser.parse(...);
     *     if (Result.isOk(result)) { ... }
     * }
     * ```
     */
    export const fail = <T>(err: string = ""): Parser<T> =>
        Parser<T>(() => ParseError(err));

    /**
     * A parser for reading zero or more whitespace characters.
     */
    export const spaces = (): Parser<string> => fromRegExp(/\s*/, "whitespace");

    /**
     * A parser for reading a sequence of digits.
     */
    export const digits = (): Parser<string> => fromRegExp(/[0-9]+/, "digits");

    /**
     * A parser for reading one digit.
     */
    export const singleDigit = (): Parser<string> =>
        fromRegExp(/[0-9]/, "a digit");

    /**
     * A parser for reading a sequence of characters (upper or lower case).
     */
    export const alpha = (): Parser<string> =>
        fromRegExp(/[a-zA-Z]+/, "characters");

    /**
     * A parser for reading a single character (upper or lower case).
     */
    export const singleAlpha = (): Parser<string> =>
        fromRegExp(/[a-zA-Z]/, "a character");

    /**
     * A parser for reading a sequence of upper case characters.
     */
    export const upper = (): Parser<string> =>
        fromRegExp(/[A-Z]+/, "upper case characters");

    /**
     * A parser for reading a single upper case character.
     */
    export const singleUpper = (): Parser<string> =>
        fromRegExp(/[A-Z]/, "an upper case character");

    /**
     * A parser for reading a sequence of lower case characters.
     */
    export const lower = (): Parser<string> =>
        fromRegExp(/[a-z]+/, "lower case characters");

    /**
     * A parser for reading a single lower case character.
     */
    export const singleLower = (): Parser<string> =>
        fromRegExp(/[a-z]/, "a lower case character");

    /**
     * A parser for reading a sequence of alpha-numeric characters (upper or lower case).
     */
    export const alphaNum = (): Parser<string> =>
        fromRegExp(/[a-zA-Z0-9]+/, "alpha numeric characters");

    /**
     * A parser for reading a single alpha-numeric character (upper or lower case).
     */
    export const singleAlphaNum = (): Parser<string> =>
        fromRegExp(/[a-zA-Z0-9]/, "an alpha numeric character");

    /**
     * Parses a number (int or float) as a string
     *
     * Allows for leading "+" or "-" symbol
     *
     * Does not allow leading "0", parses "0123" as "0".
     *
     * See {@link number} for a similar parser, but converts to a javascript number for you.
     */
    export const numberString = (): Parser<string> =>
        fromRegExp(/(\+|-)?(0|[1-9]\d*)(\.\d+)?/, "a number");

    /**
     * Greedily parses the next integer.
     *
     * Note: since this is greedy, it will parse "123.456" as "123".
     */
    export const integerPart = (): Parser<string> =>
        fromRegExp(/(\+|-)?(0|[1-9]\d*)/, "an integer");

    /**
     * Parses a number (int or float) as a javascript number
     *
     * Allows for leading "+" or "-" symbol
     *
     * Does not allow leading "0", parses "0123" as 0.
     *
     * Accepts the same inputs as {@link numberString}.
     */
    export const number = (): Parser<number> => map(Number, numberString());

    /**
     * Parses an integer
     *
     * Unlike {@link integerPart}, this parser is not greedy. It will read the next number, and succeed if that
     * number was an integer.
     */
    export const int = (): Parser<number> =>
        Parser<number>((source: string, index: number = 0) => {
            const result = number().parse(source, index);
            switch (result.variant) {
                case Result.Variant.Err:
                    return result;

                case Result.Variant.Ok:
                    if (!Number.isSafeInteger(result.value.parsed)) {
                        const [location, context] = getErrorMessageContext(
                            source,
                            index,
                        );
                        return ParseError(
                            `${location}\nExpected an integer but got "${result.value.parsed}" instead\n\n${context}`,
                        );
                    }
                    return result;
            }
        });

    const fromRegExp = (re: RegExp, expected: string) =>
        Parser<string>((source: string, index: number = 0) => {
            const match = new RegExp(`^${re.source}`).exec(source.slice(index));
            if (match === null) {
                const [location, context] = getErrorMessageContext(
                    source,
                    index,
                );
                return ParseError(
                    `${location}\nExpected ${expected} but got "${source.charAt(
                        index,
                    )}" instead\n\n${context}`,
                );
            }

            const [matched] = match;
            return ParseSuccess(matched, index + matched.length, source);
        });

    function getErrorMessageContext(
        source: string,
        index: number,
        maxPrevContext: number = 10,
        maxPostContext: number = 10,
    ): [string, string] {
        const [line, column] = getCurrentLineAndColumn(source, index);
        if (column > 1) {
            maxPrevContext = Math.min(column - 1, maxPrevContext);
        } else {
            maxPrevContext = 0;
        }
        const indentation = [...Array(maxPrevContext)].fill(" ").join("");
        return [
            `Error at (line: ${line}, column: ${column})`,
            `${truncateToNextNewLine(
                source.slice(index - maxPrevContext, index + maxPostContext),
            )}\n${indentation}^`,
        ];
    }

    function truncateToNextNewLine(str: string): string {
        for (let i = 1; i < str.length; i++) {
            if (str.charAt(i) === "\n") {
                return str.slice(0, i);
            }
        }
        return str;
    }

    function getCurrentLineAndColumn(
        source: string,
        index: number,
    ): [number, number] {
        let line = 1;
        let column = 1;
        for (let i = 0; i < index; i++) {
            if (source.charAt(i) === "\n") {
                line++;
                column = 1;
            } else {
                column++;
            }
        }
        return [line, column];
    }

    /**
     * Takes a parser and returns a parser which tries to match, using the given parser, zero or more times.
     *
     * Succeeds even if there are no matches.
     *
     * @param parser The parser to use for matching zero or more times
     */
    export const zeroOrMore = <T>(parser: Parser<T>) =>
        Parser<T[]>((source: string, index: number = 0) => {
            const results: T[] = [];
            let result: ParseResult<T> = parser.parse(source, index);
            while (Result.isOk(result)) {
                const { parsed, index: newIndex } = result.value;
                results.push(parsed);
                index = newIndex;
                result = parser.parse(source, index);
            }
            if (!result.error.backtrackable) {
                return ParseError(result.error.message);
            }
            return ParseSuccess(results, index, source);
        });

    /**
     * Takes a parser and returns a parser which tries to match, using the given parser, one or more times.
     *
     * Fails if there is not at least one match.
     *
     * @param parser The parser to use for matching one or more times
     */
    export const oneOrMore = <T>(parser: Parser<T>) =>
        Parser<T[]>((source: string, index: number = 0) => {
            const results: T[] = [];
            let result: ParseResult<T> = parser.parse(source, index);
            if (Result.isErr(result)) {
                return result;
            }

            while (Result.isOk(result)) {
                const { parsed, index: newIndex } = result.value;
                results.push(parsed);
                index = newIndex;
                result = parser.parse(source, index);
            }
            if (!result.error.backtrackable) {
                return ParseError(result.error.message);
            }
            return ParseSuccess(results, index, source);
        });

    /**
     * Accepts a list of parsers and attempts to match them one at a time, in order.
     *
     * Fails if there is not at least one match.
     *
     * @param parsers The list of parsers to use
     */
    export const oneOf = <T>(...parsers: Parser<T>[]): Parser<T> =>
        Parser((source: string, index: number = 0) => {
            let result: ParseResult<T> | null = null;
            for (let i = 0; i < parsers.length; i++) {
                const parser = parsers[i];
                result = parser.parse(source, index);
                if (Result.isOk(result)) {
                    return result;
                }
                if (!result.error.backtrackable) {
                    return ParseError(result.error.message);
                }
            }
            return result ?? ParseError("No parsers provided");
        });

    /**
     * Takes the output of a parser and transforms it based on the given function.
     * @param func the function for mapping the output of the given parser
     * @param parser The parser whose output you want to map
     */
    export const map = <A, B>(
        func: (a: A) => B,
        parser: Parser<A>,
    ): Parser<B> =>
        Parser<B>((source: string, index: number = 0) =>
            Result.map(
                ({ parsed, index }: ParseSuccess<A>): ParseSuccess<B> => ({
                    parsed: func(parsed),
                    index,
                    source,
                }),
                parser.parse(source, index),
            ),
        );

    /**
     * Attempts to parse with a given parser, and falls back to a default value on failure.
     * @param parser The parser to attempt
     * @param defaultValue The default value to fall back on
     */
    export const optional = <T>(
        parser: Parser<T>,
        defaultValue: T,
    ): Parser<T> => oneOf(parser, succeed(defaultValue));

    /**
     * Attempts to parse with a given parser. If successful, returns a `Maybe.Just` object, and otherwise returns a
     * `Maybe.Nothing` object.
     * @param parser The parser to attempt
     */
    export const maybe = <T>(parser: Parser<T>): Parser<Maybe<T>> =>
        oneOf<Maybe<T>>(map(Maybe.Just, parser), succeed(Maybe.Nothing()));

    /**
     * A parser which only runs a given parser when requested
     *
     * Allows for defining recursive parsers.
     * @param factory A function which returns a parser
     */
    export const lazy = <T>(factory: () => Parser<T>): Parser<T> =>
        Parser<T>((source: string, index: number = 0) =>
            factory().parse(source, index),
        );

    /**
     * A parser to be used in conjunction with `oneOf`. Used for "committing" to one of the parsers passed to `oneOf`.
     * Useful when using `oneOf`, and one of the parsers requires matching values. See Conditionals.md for examples.
     *
     * This is primarily for better error messages and does not affect the correctness of a parser.
     * See `Conditionals.md` for examples and motivation.
     *
     * @param antecedent The parser which decides whether `oneOf` should commit to this branch.
     * @param consequent The parser to run if `antecedent` succeeds. The error from this parser is the error returned by
     * the `oneOf` parser
     */
    export const conditional = <A, B>(
        antecedent: Parser<A>,
        consequent: Parser<B>,
    ) =>
        Parser<[A, B]>((source: string, index: number = 0) => {
            const ant = antecedent.parse(source, index);
            if (Result.isErr(ant)) {
                return ant;
            }

            const { parsed: parsedAnt, index: newIndex } = ant.value;
            index = newIndex;

            const cons = consequent.parse(source, index);
            if (Result.isErr(cons)) {
                return ParseError(cons.error.message, false);
            }

            return ParseSuccess(
                [parsedAnt, cons.value.parsed],
                cons.value.index,
                source,
            );
        });
}

export namespace Parser {
    /**
     * Accepts a list of parsers and succeeds only if they all succeed.
     *
     * @param parserA The parser to try first
     * @param parserB The parser to try second
     */
    export function sequence<A, B>(
        parserA: Parser<A>,
        parserB: Parser<B>,
    ): Parser<[A, B]>;
    /**
     * Accepts a list of parsers and succeeds only if they all succeed.
     *
     * @param parserA The parser to try first
     * @param parserB The parser to try second
     * @param parserC The parser to try third
     */
    export function sequence<A, B, C>(
        parserA: Parser<A>,
        parserB: Parser<B>,
        parserC: Parser<C>,
    ): Parser<[A, B, C]>;
    /**
     * Accepts a list of parsers and succeeds only if they all succeed.
     *
     * @param parserA The parser to try first
     * @param parserB The parser to try second
     * @param parserC The parser to try third
     * @param parserD The parser to try fourth
     */
    export function sequence<A, B, C, D>(
        parserA: Parser<A>,
        parserB: Parser<B>,
        parserC: Parser<C>,
        parserD: Parser<D>,
    ): Parser<[A, B, C, D]>;
    /**
     * Accepts a list of parsers and succeeds only if they all succeed.
     *
     * @param parserA The parser to try first
     * @param parserB The parser to try second
     * @param parserC The parser to try third
     * @param parserD The parser to try fourth
     * @param parserE The parser to try fifth
     */
    export function sequence<A, B, C, D, E>(
        parserA: Parser<A>,
        parserB: Parser<B>,
        parserC: Parser<C>,
        parserD: Parser<D>,
        parserE: Parser<E>,
    ): Parser<[A, B, C, D, E]>;
    /**
     * Accepts a list of parsers and succeeds only if they all succeed.
     *
     * @param parserA The parser to try first
     * @param parserB The parser to try second
     * @param parserC The parser to try third
     * @param parserD The parser to try fourth
     * @param parserE The parser to try fifth
     * @param parserF The parser to try sixth
     */
    export function sequence<A, B, C, D, E, F>(
        parserA: Parser<A>,
        parserB: Parser<B>,
        parserC: Parser<C>,
        parserD: Parser<D>,
        parserE: Parser<E>,
        parserF: Parser<F>,
    ): Parser<[A, B, C, D, E, F]>;
    /**
     * Accepts a list of parsers and succeeds only if they all succeed.
     *
     * @param parserA The parser to try first
     * @param parserB The parser to try second
     * @param parserC The parser to try third
     * @param parserD The parser to try fourth
     * @param parserE The parser to try fifth
     * @param parserF The parser to try sixth
     * @param parserG The parser to try seventh
     */
    export function sequence<A, B, C, D, E, F, G>(
        parserA: Parser<A>,
        parserB: Parser<B>,
        parserC: Parser<C>,
        parserD: Parser<D>,
        parserE: Parser<E>,
        parserF: Parser<F>,
        parserG: Parser<G>,
    ): Parser<[A, B, C, D, E, F, G]>;
    /**
     * Accepts a list of parsers and succeeds only if they all succeed.
     *
     * @param parserA The parser to try first
     * @param parserB The parser to try second
     * @param parserC The parser to try third
     * @param parserD The parser to try fourth
     * @param parserE The parser to try fifth
     * @param parserF The parser to try sixth
     * @param parserG The parser to try seventh
     * @param parserH The parser to try eigth
     */
    export function sequence<A, B, C, D, E, F, G, H>(
        parserA: Parser<A>,
        parserB: Parser<B>,
        parserC: Parser<C>,
        parserD: Parser<D>,
        parserE: Parser<E>,
        parserF: Parser<F>,
        parserG: Parser<G>,
        parserH: Parser<H>,
    ): Parser<[A, B, C, D, E, F, G, H]>;
    /**
     * Accepts a list of parsers and succeeds only if they all succeed.
     *
     * @param parserA The parser to try first
     * @param parserB The parser to try second
     * @param parserC The parser to try third
     * @param parserD The parser to try fourth
     * @param parserE The parser to try fifth
     * @param parserF The parser to try sixth
     * @param parserG The parser to try seventh
     * @param parserH The parser to try eigth
     * @param parserI The parser to try ninth
     */
    export function sequence<A, B, C, D, E, F, G, H, I>(
        parserA: Parser<A>,
        parserB: Parser<B>,
        parserC: Parser<C>,
        parserD: Parser<D>,
        parserE: Parser<E>,
        parserF: Parser<F>,
        parserG: Parser<G>,
        parserH: Parser<H>,
        parserI: Parser<I>,
    ): Parser<[A, B, C, D, E, F, G, H, I]>;
    /**
     * Accepts a list of parsers and succeeds only if they all succeed.
     *
     * @param parserA The parser to try first
     * @param parserB The parser to try second
     * @param parserC The parser to try third
     * @param parserD The parser to try fourth
     * @param parserE The parser to try fifth
     * @param parserF The parser to try sixth
     * @param parserG The parser to try seventh
     * @param parserH The parser to try eigth
     * @param parserI The parser to try ninth
     * @param parserJ The parser to try tenth
     */
    export function sequence<A, B, C, D, E, F, G, H, I, J>(
        parserA: Parser<A>,
        parserB: Parser<B>,
        parserC: Parser<C>,
        parserD: Parser<D>,
        parserE: Parser<E>,
        parserF: Parser<F>,
        parserG: Parser<G>,
        parserH: Parser<H>,
        parserI: Parser<I>,
        parserJ: Parser<J>,
    ): Parser<[A, B, C, D, E, F, G, H, I, J]>;

    /**
     * Accepts a list of parsers and succeeds only if they all succeed.
     *
     * General case
     * @param parsers The sequence of parsers to attempt
     */
    export function sequence<T>(...parsers: Parser<T>[]): Parser<T[]> {
        return Parser((source: string, index: number = 0) => {
            const values: T[] = new Array(parsers.length);
            let result: ParseResult<T>;
            for (let i = 0; i < parsers.length; i++) {
                result = parsers[i].parse(source, index);
                switch (result.variant) {
                    case Result.Variant.Err:
                        return result;

                    case Result.Variant.Ok:
                        const { parsed, index: newIndex } = result.value;
                        values[i] = parsed;
                        index = newIndex;
                }
            }
            return ParseSuccess(values, index, source);
        });
    }
}

export namespace Parser {
    export type UnaryOperator<T = string> = {
        symbol: T;
        bindingPower: number;
    };
    export const toUnaryOperator = <T = string>(
        operatorSymbol: Parser<T>,
        bindingPower: number,
    ): Parser<UnaryOperator<T>> =>
        map(
            ([, symbol]) => ({
                symbol,
                bindingPower,
            }),
            sequence(spaces(), operatorSymbol, spaces()),
        );

    export type BinaryOperator<T = string> = {
        symbol: T;
        bindingPower: [number, number];
    };
    export const toBinaryOperator = <T = string>(
        operatorSymbol: Parser<T>,
        bindingPower: [number, number],
    ): Parser<BinaryOperator<T>> =>
        map(
            ([, symbol]) => ({
                symbol,
                bindingPower,
            }),
            sequence(spaces(), operatorSymbol, spaces()),
        );

    export type OperatorOptions<
        T,
        Acc = T,
        Infix = string,
        Prefix = string,
        Postfix = string,
    > = {
        infix: {
            op: Parser<BinaryOperator<Infix>>;
            acc: (symbol: Infix, left: Acc | T, right: Acc | T) => Acc;
        };
        prefix?: {
            op: Parser<UnaryOperator<Prefix>>;
            acc: (symbol: Prefix, right: Acc | T) => Acc;
        };
        postfix?: {
            op: Parser<UnaryOperator<Postfix>>;
            acc: (symbol: Postfix, left: Acc | T) => Acc;
        };
        scope?: {
            scopeBegin: Parser<string>;
            scopeEnd: Parser<string>;
        };
    };

    /**
     * A Pratt parser is a parser based on the paper [top-down operator precedence](https://tdop.github.io/) by
     * Vaughan Pratt.
     * Many thanks to [this blog post](https://matklad.github.io/2020/04/13/simple-but-powerful-pratt-parsing.html) from
     * [Aleksey Kladov](https://matklad.github.io)
     */
    export const pratt = <
        T,
        Acc = T,
        Infix = string,
        Prefix = string,
        Postfix = string,
    >(
        left: Parser<T>,
        {
            infix,
            prefix,
            postfix,
            scope,
        }: OperatorOptions<T, Acc, Infix, Prefix, Postfix>,
    ): Parser<Acc | T> =>
        Parser<Acc | T>((source: string, index: number = 0) => {
            const isEof = () => index === source.length;
            function expr(minBindingPower: number = 0): ParseResult<Acc | T> {
                let full: Acc | T;
                const prefixResult =
                    prefix === undefined
                        ? Result.Err("")
                        : prefix.op.parse(source, index);

                if (Result.isOk(prefixResult)) {
                    const [
                        { symbol, bindingPower: rightBindingPower },
                        newIndex,
                    ] = prefixResult.value;
                    index = newIndex;

                    const rhs = expr(rightBindingPower);
                    if (Result.isErr(rhs)) {
                        return rhs;
                    }

                    full =
                        prefix === undefined
                            ? rhs.value[0]
                            : prefix.acc(symbol, rhs.value[0]);
                } else {
                    const scopeBeginResult =
                        scope === undefined
                            ? Result.Err("")
                            : scope.scopeBegin.parse(source, index);

                    if (Result.isOk(scopeBeginResult)) {
                        index = scopeBeginResult.value[1];
                        const lhs = expr(0);

                        if (Result.isErr(lhs)) {
                            return lhs;
                        }

                        const scopeEndResult =
                            scope === undefined
                                ? Result.Err("")
                                : scope.scopeEnd.parse(source, index);

                        if (Result.isErr(scopeEndResult)) {
                            return scopeEndResult;
                        }
                        index = scopeEndResult.value[1];
                        full = lhs.value[0];
                    } else {
                        const lhs = left.parse(source, index);
                        if (Result.isErr(lhs)) {
                            return lhs;
                        }
                        full = lhs.value[0];
                        index = lhs.value[1];
                    }
                }

                while (true) {
                    if (isEof()) {
                        break;
                    }

                    const postfixResult =
                        postfix === undefined
                            ? Result.Err("")
                            : postfix.op.parse(source, index);

                    if (Result.isOk(postfixResult)) {
                        const [
                            { symbol, bindingPower: leftBindingPower },
                            newIndex,
                        ] = postfixResult.value;
                        if (leftBindingPower < minBindingPower) {
                            break;
                        }
                        index = newIndex;

                        full =
                            postfix === undefined
                                ? full
                                : postfix.acc(symbol, full);
                        continue;
                    }

                    const scopeEndResult =
                        scope === undefined
                            ? Result.Err("")
                            : scope.scopeEnd.parse(source, index);

                    if (Result.isOk(scopeEndResult)) {
                        break;
                    }

                    const op = infix.op.parse(source, index);
                    if (Result.isErr(op)) {
                        return op;
                    }
                    const [{ symbol, bindingPower }, newIndex] = op.value;
                    const [leftBindingPower, rightBindingPower] = bindingPower;
                    if (leftBindingPower < minBindingPower) {
                        break;
                    }
                    index = newIndex;

                    const rhs = expr(rightBindingPower);
                    if (Result.isErr(rhs)) {
                        return rhs;
                    }
                    full = infix.acc(symbol, full, rhs.value[0]);
                }
                return Result.Ok([full, index, source]);
            }

            return expr();
        });
}
