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
     * Takes the value from an Ok result and transforms it based on the given function.
     * Acts like identity function in Err case
     * @param f the function for mapping the output of the given result
     * @param result the result whose Ok value you want to map
     */
    export const map = <A, B, E>(
        f: (a: A) => B,
        result: Result<A, E>,
    ): Result<B, E> => {
        switch (result.variant) {
            case Variant.Err:
                return result;

            case Variant.Ok:
                return Result.Ok(f(result.value));
        }
    };

    export const mapErr = <T, E, F>(
        f: (a: E) => F,
        result: Result<T, E>,
    ): Result<T, F> => {
        switch (result.variant) {
            case Variant.Err:
                return Result.Err(f(result.error));

            case Variant.Ok:
                return result;
        }
    };

    export const bind = <A, B, E>(
        f: (a: A) => Result<B, E>,
        result: Result<A, E>,
    ): Result<B, E> => {
        switch (result.variant) {
            case Variant.Err:
                return result;

            case Variant.Ok:
                return f(result.value);
        }
    };

    export const flatMap = bind;

    export const chain = bind;

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

    export const unwrapOr = <T, E>(result: Result<T, E>, fallback: T): T =>
        Result.isErr(result) ? fallback : result.value;

    export const unwrapOrElse = <T, E>(
        result: Result<T, E>,
        fallback: (e: E) => T,
    ): T => (Result.isErr(result) ? fallback(result.error) : result.value);
}
