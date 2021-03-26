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
}
