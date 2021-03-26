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
}
