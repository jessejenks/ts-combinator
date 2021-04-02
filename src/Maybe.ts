/**
 * A type for holding data which may or may not may not have a value.
 */
export type Maybe<T> = Maybe.Just<T> | Maybe.Nothing;

export namespace Maybe {
    export enum Variant {
        Just = "Just",
        Nothing = "Nothing",
    }

    export type Just<T> = {
        variant: Variant.Just;
        value: T;
    };

    export type Nothing = {
        variant: Variant.Nothing;
    };

    export function Just<T>(value: T): Just<T> {
        return {
            variant: Variant.Just,
            value,
        };
    }

    export function Nothing(): Nothing {
        return {
            variant: Variant.Nothing,
        };
    }

    export function isJust<T>(maybe: Maybe<T>): maybe is Just<T> {
        return maybe.variant === Variant.Just;
    }

    export function isNothing<T>(maybe: Maybe<T>): maybe is Nothing {
        return maybe.variant === Variant.Nothing;
    }
}
