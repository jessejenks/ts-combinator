/**
 * A type for holding the result of a process which can either succeed or fail.
 * These cases are referred to as Ok and Err respectively
 */
export type Result<T, E> = Result.Ok<T> | Result.Err<E>;

export namespace Result {
    export enum Variant {
        Ok = "Ok",
        Err = "Err",
    }

    export type Ok<T> = {
        variant: Variant.Ok;
        value: T;
    };

    export type Err<E> = {
        variant: Variant.Err;
        error: E;
    };

    export function Ok<T>(value: T): Ok<T> {
        return {
            variant: Variant.Ok,
            value,
        };
    }

    export function Err<E>(error: E): Err<E> {
        return {
            variant: Variant.Err,
            error,
        };
    }

    export function isOk<T, E>(result: Result<T, E>): result is Ok<T> {
        return result.variant === Variant.Ok;
    }

    export function isErr<T, E>(result: Result<T, E>): result is Err<E> {
        return result.variant === Variant.Err;
    }

    export const fromNullable = <T, E>(
        value: T | null | undefined,
        err: E,
    ): Result<T, E> =>
        value === null || value === undefined
            ? Result.Err(err)
            : Result.Ok(value);

    /**
     * Eliminates a result, in the sense of introduction and elimination of a sum type.
     * @param onOk how to map an Ok value to the output type
     * @param onErr how to map an Err value to the output type
     * @param result the result to eliminate
     */
    export const eliminate = <T, E, W>(
        onOk: (t: T) => W,
        onErr: (e: E) => W,
        result: Result<T, E>,
    ): W => {
        switch (result.variant) {
            case Variant.Ok:
                return onOk(result.value);
            case Variant.Err:
                return onErr(result.error);
        }
    };

    /**
     * Maps an Ok value according to f, and does nothing to an Err
     * @param f the mapping
     * @param result the result whose Ok value you want to map
     * @see {@link eliminate}
     */
    export const map = <A, B, E>(
        f: (a: A) => B,
        result: Result<A, E>,
    ): Result<B, E> =>
        eliminate((a): Result<B, E> => Result.Ok(f(a)), Result.Err, result);

    /**
     * Maps an Err value according to f, and does nothing to an Ok
     * @param f the mapping
     * @param result the result whose Err value you want to map
     * @see {@link eliminate}
     */
    export const mapErr = <T, E, F>(
        f: (e: E) => F,
        result: Result<T, E>,
    ): Result<T, F> =>
        eliminate(Result.Ok, (e): Result<T, F> => Result.Err(f(e)), result);

    /**
     * Maps an Ok value to another Result with the same Err type
     * @param f the mapping to another Result type
     * @param result the result whose Ok value you want to map
     * @see {@link eliminate}
     * @example
     * ```ts
     * bind(
     *   mightFail(x, y),
     *   (result) => bind(
     *     alsoMightFail(result, z),
     *     (finalResult) => finallyMightFail(finalResult, a, b, c),
     *   ),
     * );
     * ```
     */
    export const bind = <A, B, E>(
        result: Result<A, E>,
        f: (a: A) => Result<B, E>,
    ): Result<B, E> => eliminate((a): Result<B, E> => f(a), Result.Err, result);

    /**
     * Alias for {@link bind}
     */
    export const flatMap = bind;

    /**
     * Alias for {@link bind}
     */
    export const chain = bind;

    /**
     * Checks results sequentially and either succeeds with all values, or fails on the first Err
     * @param results results to check
     */
    export const all = <T, E>(results: Result<T, E>[]): Result<T[], E> => {
        const innerResults = new Array<T>(results.length);
        for (let i = 0; i < results.length; i++) {
            const result = results[i];
            if (Result.isErr(result)) {
                return result;
            }
            innerResults[i] = result.value;
        }
        return Result.Ok(innerResults);
    };

    /**
     * Gets the value from a result, with a fallback if the result was an Err
     * @param result
     * @param fallback
     */
    export const unwrapOr = <T, E>(result: Result<T, E>, fallback: T): T =>
        Result.isErr(result) ? fallback : result.value;

    /**
     * Gets the value from a result, with a computed fallback if the result was an Err
     * @param result
     * @param fallback
     */
    export const unwrapOrElse = <T, E>(
        result: Result<T, E>,
        fallback: (e: E) => T,
    ): T => (Result.isErr(result) ? fallback(result.error) : result.value);
}
