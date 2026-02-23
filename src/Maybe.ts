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

    export const map = <A, B>(f: (a: A) => B, maybe: Maybe<A>): Maybe<B> => {
        switch (maybe.variant) {
            case Variant.Nothing:
                return maybe;

            case Variant.Just:
                return Maybe.Just(f(maybe.value));
        }
    };

    export const bind = <A, B>(
        f: (a: A) => Maybe<B>,
        maybe: Maybe<A>,
    ): Maybe<B> => {
        switch (maybe.variant) {
            case Variant.Nothing:
                return maybe;

            case Variant.Just:
                return f(maybe.value);
        }
    };

    export const flatMap = bind;

    export const chain = bind;

    export const all = <T>(maybes: Maybe<T>[]): Maybe<T[]> => {
        const innerMaybes = new Array<T>(maybes.length);
        for (let i = 0; i < maybes.length; i++) {
            const result = maybes[i];
            if (Maybe.isNothing(result)) {
                return result;
            }
            innerMaybes[i] = result.value;
        }
        return Maybe.Just(innerMaybes);
    };

    export const unwrapOr = <T>(maybe: Maybe<T>, fallback: T): T =>
        Maybe.isNothing(maybe) ? fallback : maybe.value;
}
