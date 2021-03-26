type ParseResult<T> =
    | {
          ok: true;
          value: [T, string];
      }
    | {
          ok: false;
          value: string;
      };

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
                return {
                    ok: true,
                    value: [toMatch, source.slice(toMatch.length)],
                };
            }
            return {
                ok: false,
                value: `Expected "${toMatch}" but got "${source.slice(
                    0,
                    toMatch.length,
                )}" instead`,
            };
        });

    export const succeed = <T>(value: T): Parser<T> =>
        Parser<T>((source: string) => ({ ok: true, value: [value, source] }));
}
