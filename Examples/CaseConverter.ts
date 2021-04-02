import { Maybe } from "../src/Maybe";
import { Result } from "../src/Result";
import { Parser } from "../src/Parser";

const {
    oneOf,
    singleUpper,
    lower,
    exact,
    oneOrMore,
    zeroOrMore,
    sequence,
    map,
    maybe,
} = Parser;

export enum Casing {
    Pascal = "Pascal",
    Camel = "Camel",
    Snake = "Snake",
}

export const convertCasing = (input: string, to: Casing, from?: Casing) => {
    if (from === undefined) {
        const result = detectCasing.parse(input);
        if (Result.isErr(result)) {
            return Result.Err("Could not detect input casing");
        }
        from = result.value[0];
    }
    switch (from) {
        case Casing.Pascal:
            return convertCasingFromPascal(input, to);

        case Casing.Camel:
            return convertCasingFromCamel(input, to);

        case Casing.Snake:
            return convertCasingFromSnake(input, to);
    }
};

export const detectCasing = oneOf(
    map(
        () => Casing.Pascal,

        oneOrMore(sequence(singleUpper(), lower())),
    ),
    map(
        ([, maybePieces]) =>
            Maybe.isNothing(maybePieces) || maybePieces.value.length === 0
                ? Casing.Camel
                : maybePieces.value[0][0] === "_"
                ? Casing.Snake
                : Casing.Camel,

        sequence(
            lower(),
            maybe(
                oneOf(
                    oneOrMore(sequence(singleUpper(), lower())),
                    oneOrMore(sequence(exact("_"), lower())),
                ),
            ),
        ),
    ),
);

const convertCasingFromPascal = (input: string, to: Casing) => {
    const result = pascal.parse(input);

    if (Result.isErr(result)) {
        return Result.Err(`input: "${input}" was not PascalCased`);
    }

    const pieces = result.value[0];
    switch (to) {
        case Casing.Pascal:
            return Result.Ok(pieces.map(([up, rest]) => up + rest).join(""));

        case Casing.Camel:
            return Result.Ok(
                pieces
                    .map(
                        ([up, rest], i) =>
                            (i === 0 ? up.toLowerCase() : up) + rest,
                    )
                    .join(""),
            );

        case Casing.Snake:
            return Result.Ok(
                pieces
                    .map(([up, rest], i) => up.toLowerCase() + rest)
                    .join("_"),
            );
    }
};

const convertCasingFromCamel = (input: string, to: Casing) => {
    const result = camel.parse(input);

    if (Result.isErr(result)) {
        return Result.Err(`input: "${input}" was not camelCased`);
    }

    const [[leading, rest]] = result.value;
    switch (to) {
        case Casing.Pascal:
            return Result.Ok(
                capitalize(leading) +
                    rest.map(([up, lower]) => up + lower).join(""),
            );

        case Casing.Camel:
            return Result.Ok(
                leading + rest.map(([up, lower]) => up + lower).join(""),
            );

        case Casing.Snake:
            return Result.Ok(
                leading +
                    "_" +
                    rest
                        .map(([up, lower]) => up.toLowerCase() + lower)
                        .join("_"),
            );
    }
};

const convertCasingFromSnake = (input: string, to: Casing) => {
    const result = snake.parse(input);

    if (Result.isErr(result)) {
        return Result.Err(`input: "${input}" was not snake_cased`);
    }

    const [[leading, rest]] = result.value;
    switch (to) {
        case Casing.Pascal:
            return Result.Ok(
                capitalize(leading) +
                    rest.map(([, lower]) => capitalize(lower)).join(""),
            );

        case Casing.Camel:
            return Result.Ok(
                leading + rest.map(([, lower]) => capitalize(lower)).join(""),
            );

        case Casing.Snake:
            return Result.Ok(
                leading + rest.map(([under, lower]) => under + lower).join(""),
            );
    }
};

export const pascal = oneOrMore(sequence(singleUpper(), lower()));

export const camel = sequence(
    lower(),
    zeroOrMore(sequence(singleUpper(), lower())),
);

export const snake = sequence(
    lower(),
    zeroOrMore(sequence(exact("_"), lower())),
);

const capitalize = (input: string) =>
    input.charAt(0).toUpperCase() + input.slice(1);
