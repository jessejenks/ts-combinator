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
}
