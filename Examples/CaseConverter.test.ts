import { Result } from "../src/Result";
import { Casing, detectCasing, convertCasing } from "./CaseConverter";

describe("parses string casing", () => {
    const detectionCases: Array<[string, string, Casing]> = [
        ["NiceAndCool", "", Casing.Pascal],
        ["niceAndCool", "", Casing.Camel],
        ["nice_and_cool", "", Casing.Snake],
        ["NiceAndCoolW", "W", Casing.Pascal],
        ["niceAndCoolW", "W", Casing.Camel],
        ["nice_and_cool_", "_", Casing.Snake],
        ["nice", "", Casing.Camel],
        ["NiceAnd_cool", "_cool", Casing.Pascal],
        ["niceAnd_cool", "_cool", Casing.Camel],
        ["nice_andCool", "Cool", Casing.Snake],
    ];

    test.each(detectionCases)(
        'parses "%s" with remainder "%s" as "%s"',
        (input, remaining, expected) => {
            const result = detectCasing.parse(input);
            switch (result.variant) {
                case Result.Variant.Ok:
                    const { parsed: casing, index } = result.value;
                    expect(casing).toBe(expected);
                    expect(input.slice(index)).toBe(remaining);
                    break;

                default:
                    fail(result.error);
            }
        },
    );

    const detectAndConvert: Array<
        [string, Casing, Casing | undefined, string]
    > = [
        ["PascalCased", Casing.Pascal, Casing.Pascal, "PascalCased"],
        ["camelCased", Casing.Camel, Casing.Camel, "camelCased"],
        ["snake_cased", Casing.Snake, Casing.Snake, "snake_cased"],

        ["PascalCasedW", Casing.Pascal, Casing.Pascal, "PascalCased"],
        ["camelCasedW", Casing.Camel, Casing.Camel, "camelCased"],
        ["snake_cased_", Casing.Snake, Casing.Snake, "snake_cased"],

        [
            "PascalCased_nice_andCool",
            Casing.Pascal,
            Casing.Pascal,
            "PascalCased",
        ],
        ["camelCased_nice_AndCool", Casing.Camel, Casing.Camel, "camelCased"],
        ["snake_casedNiceAndCool", Casing.Snake, Casing.Snake, "snake_cased"],

        ["PascalCased", Casing.Camel, Casing.Pascal, "pascalCased"],
        ["PascalCased", Casing.Snake, Casing.Pascal, "pascal_cased"],

        ["camelCased", Casing.Pascal, Casing.Camel, "CamelCased"],
        ["camelCased", Casing.Snake, Casing.Camel, "camel_cased"],

        ["snake_cased", Casing.Pascal, Casing.Snake, "SnakeCased"],
        ["snake_cased", Casing.Camel, Casing.Snake, "snakeCased"],

        ["PascalCased", Casing.Pascal, undefined, "PascalCased"],
        ["camelCased", Casing.Camel, undefined, "camelCased"],
        ["snake_cased", Casing.Snake, undefined, "snake_cased"],

        ["PascalCasedW", Casing.Pascal, undefined, "PascalCased"],
        ["camelCasedW", Casing.Camel, undefined, "camelCased"],
        ["snake_cased_", Casing.Snake, undefined, "snake_cased"],

        ["PascalCased_nice_andCool", Casing.Pascal, undefined, "PascalCased"],
        ["camelCased_nice_AndCool", Casing.Camel, undefined, "camelCased"],
        ["snake_casedNiceAndCool", Casing.Snake, undefined, "snake_cased"],

        ["PascalCased", Casing.Camel, undefined, "pascalCased"],
        ["PascalCased", Casing.Snake, undefined, "pascal_cased"],

        ["camelCased", Casing.Pascal, undefined, "CamelCased"],
        ["camelCased", Casing.Snake, undefined, "camel_cased"],

        ["snake_cased", Casing.Pascal, undefined, "SnakeCased"],
        ["snake_cased", Casing.Camel, undefined, "snakeCased"],
    ];

    test.each(detectAndConvert)(
        "converts '%s' to '%s' casing",
        (input, to, from, output) => {
            const result = convertCasing(input, to, from);
            switch (result.variant) {
                case Result.Variant.Ok:
                    expect(result.value).toBe(output);
                    break;

                case Result.Variant.Err:
                    fail(result.error);
            }
        },
    );
});
