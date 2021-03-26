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

    export const spaces = (): Parser<string> =>
        Parser((source: string) => {
            const match = /^\s*/.exec(source);
            if (match === null) {
                return Result.Err(
                    `Expected spaces, but got "${source.slice(
                        0,
                        5,
                    )}..." instead`,
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
