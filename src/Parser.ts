import { Maybe } from "./Maybe";
import { Result } from "./Result";

type ParseResult<T> = Result<[T, string], string>;

export type Parser<T> = {
    parse: (source: string) => ParseResult<T>;
};

export namespace Parser {
    export function Parser<T>(
        parse: (source: string) => ParseResult<T>,
    ): Parser<T> {
        return { parse };
    }

    export const exact = (toMatch: string): Parser<string> =>
        Parser<string>((source: string) => {
            if (source.slice(0, toMatch.length) === toMatch) {
                return Result.Ok([toMatch, source.slice(toMatch.length)]);
            }
            return Result.Err(
                `Expected "${toMatch}" but got "${source.slice(
                    0,
                    toMatch.length,
                )}" instead`,
            );
        });

    export const succeed = <T>(value: T): Parser<T> =>
        Parser<T>((source: string) => Result.Ok([value, source]));

    export const spaces = (): Parser<string> => fromRegExp(/\s*/, "whitespace");

    export const digits = (): Parser<string> => fromRegExp(/[0-9]+/, "digits");

    export const singleDigit = (): Parser<string> =>
        fromRegExp(/[0-9]/, "a digit");

    export const alpha = (): Parser<string> =>
        fromRegExp(/[a-zA-Z]+/, "characters");

    export const singleAlpha = (): Parser<string> =>
        fromRegExp(/[a-zA-Z]/, "a character");

    export const upper = (): Parser<string> =>
        fromRegExp(/[A-Z]+/, "upper case characters");

    export const singleUpper = (): Parser<string> =>
        fromRegExp(/[A-Z]/, "an upper case character");

    export const lower = (): Parser<string> =>
        fromRegExp(/[a-z]+/, "lower case characters");

    export const singleLower = (): Parser<string> =>
        fromRegExp(/[a-z]/, "a lower case character");

    export const alphaNum = (): Parser<string> =>
        fromRegExp(/[a-zA-Z0-9]+/, "alpha numeric characters");

    export const singleAlphaNum = (): Parser<string> =>
        fromRegExp(/[a-zA-Z0-9]/, "an alpha numeric character");

    export const numberString = (): Parser<string> =>
        fromRegExp(/(\+|-)?(0|[1-9]\d*)(\.\d+)?/, "a number");

    export const integerPart = (): Parser<string> =>
        fromRegExp(/(\+|-)?(0|[1-9]\d*)/, "an integer");

    export const number = (): Parser<number> =>
        map(Number, fromRegExp(/(\+|-)?(0|[1-9]\d*)(\.\d+)?/, "a number"));

    export const int = (): Parser<number> =>
        Parser<number>((source: string) => {
            const result = number().parse(source);
            switch (result.variant) {
                case Result.Variant.Err:
                    return result;

                case Result.Variant.Ok:
                    if (!Number.isSafeInteger(result.value[0])) {
                        return Result.Err(
                            `Expected an integer but got "${result.value[0]}" instead`,
                        );
                    }
                    return result;
            }
        });

    const fromRegExp = (re: RegExp, expected: string) =>
        Parser<string>((source: string) => {
            const match = new RegExp(`^${re.source}`).exec(source);
            if (match === null) {
                return Result.Err(
                    `Expected ${expected} but got "${source.charAt(
                        0,
                    )}" instead`,
                );
            }

            const [matched] = match;
            const rest = source.slice(match.index + matched.length);
            return Result.Ok([matched, rest]);
        });

    export const zeroOrMore = <T>(parser: Parser<T>) =>
        Parser<T[]>((source: string) => {
            const results: T[] = [];
            let result: ParseResult<T> = parser.parse(source);
            while (Result.isOk(result)) {
                results.push(result.value[0]);
                source = result.value[1];
                result = parser.parse(source);
            }
            return Result.Ok([results, source]);
        });

    export const oneOrMore = <T>(parser: Parser<T>) =>
        Parser<T[]>((source: string) => {
            const results: T[] = [];
            let result: ParseResult<T> = parser.parse(source);
            if (Result.isErr(result)) {
                return result;
            }

            while (Result.isOk(result)) {
                results.push(result.value[0]);
                source = result.value[1];
                result = parser.parse(source);
            }
            return Result.Ok([results, source]);
        });

    export const oneOf = <T>(...parsers: Parser<T>[]): Parser<T> =>
        Parser((source: string) => {
            let result: Result<[T, string], string> | null = null;
            for (let i = 0; i < parsers.length; i++) {
                const parser = parsers[i];
                result = parser.parse(source);
                if (Result.isOk(result)) {
                    return result;
                }
            }
            return result ?? Result.Err("No parsers provided");
        });

    export const map = <A, B>(
        func: (a: A) => B,
        parser: Parser<A>,
    ): Parser<B> =>
        Parser<B>((source: string) =>
            Result.map(
                ([a, rest]: [A, string]): [B, string] => [func(a), rest],
                parser.parse(source),
            ),
        );

    export const optional = <T>(
        parser: Parser<T>,
        defaultValue: T,
    ): Parser<T> => oneOf(parser, succeed(defaultValue));

    export const maybe = <T>(parser: Parser<T>): Parser<Maybe<T>> =>
        oneOf<Maybe<T>>(map(Maybe.Just, parser), succeed(Maybe.Nothing()));

    export const lazy = <T>(factory: () => Parser<T>): Parser<T> =>
        Parser<T>((source: string) => factory().parse(source));
}

export namespace Parser {
    export function sequence<A, B>(
        parserA: Parser<A>,
        parserB: Parser<B>,
    ): Parser<[A, B]>;
    export function sequence<A, B, C>(
        parserA: Parser<A>,
        parserB: Parser<B>,
        parserC: Parser<C>,
    ): Parser<[A, B, C]>;
    export function sequence<A, B, C, D>(
        parserA: Parser<A>,
        parserB: Parser<B>,
        parserC: Parser<C>,
        parserD: Parser<D>,
    ): Parser<[A, B, C, D]>;
    export function sequence<A, B, C, D, E>(
        parserA: Parser<A>,
        parserB: Parser<B>,
        parserC: Parser<C>,
        parserD: Parser<D>,
        parserE: Parser<E>,
    ): Parser<[A, B, C, D, E]>;
    export function sequence<A, B, C, D, E, F>(
        parserA: Parser<A>,
        parserB: Parser<B>,
        parserC: Parser<C>,
        parserD: Parser<D>,
        parserE: Parser<E>,
        parserF: Parser<F>,
    ): Parser<[A, B, C, D, E, F]>;
    export function sequence<A, B, C, D, E, F, G>(
        parserA: Parser<A>,
        parserB: Parser<B>,
        parserC: Parser<C>,
        parserD: Parser<D>,
        parserE: Parser<E>,
        parserF: Parser<F>,
        parserG: Parser<G>,
    ): Parser<[A, B, C, D, E, F, G]>;
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

    export function sequence<T>(...parsers: Parser<T>[]): Parser<T[]> {
        return Parser((source: string) => {
            const values: T[] = new Array(parsers.length);
            let remaining = source;
            let result: ParseResult<T>;
            for (let i = 0; i < parsers.length; i++) {
                result = parsers[i].parse(remaining);

                switch (result.variant) {
                    case Result.Variant.Err:
                        return result;

                    case Result.Variant.Ok:
                        const [value, rest] = result.value;
                        values[i] = value;
                        remaining = rest;
                }
            }
            return Result.Ok([values, remaining]);
        });
    }
}
