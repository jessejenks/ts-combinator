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
}
