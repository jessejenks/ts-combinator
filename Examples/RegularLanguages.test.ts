import { Result } from "../src/Result";
import { Parser } from "../src/Parser";

const {
    map,
    exact,
    sequence,
    oneOf,
    zeroOrMore,
    singleDigit,
    optional,
    maybe,
} = Parser;

describe("simple regular expression /a(b|c)d*/", () => {
    const parser = map(
        ([a, bOrC, manyDs]) => [a, bOrC, ...manyDs],
        sequence(
            exact("a"),
            oneOf(exact("b"), exact("c")),
            zeroOrMore(exact("d")),
        ),
    );

    const okCases: Array<[string, string[]]> = [
        ["ab", ["a", "b"]],
        ["ac", ["a", "c"]],
        ["abd", ["a", "b", "d"]],
        ["acd", ["a", "c", "d"]],
        ["abddddd", ["a", "b", "d", "d", "d", "d", "d"]],
    ];

    test.each(okCases)("Matches '%s'", (source, matches) => {
        const result = parser.parse(source);
        switch (result.variant) {
            case Result.Variant.Ok:
                expect(result.value.parsed).toEqual(matches);
                break;

            case Result.Variant.Err:
                fail(result.error);
        }
    });

    const errCases: Array<[string, string]> = [
        [
            "bd",
            'Error at (line: 1, column: 1)\nExpected "a" but got "b" instead\n\nbd\n^',
        ],
        [
            "ad",
            'Error at (line: 1, column: 2)\nExpected "c" but got "d" instead\n\nad\n ^',
        ],
    ];

    test.each(errCases)("Does not match '%s'", (source, errMessage) => {
        const result = parser.parse(source);
        switch (result.variant) {
            case Result.Variant.Err:
                expect(result.error.message).toBe(errMessage);
                break;

            case Result.Variant.Ok:
                console.log(result);
                fail("Should not have parsed");
        }
    });
});

describe("date parser", () => {
    type Year = { year: string };
    type Month = { month: string };
    type Day = { day: string };

    type DateObject = Year & Month & Day;

    const yearParser = map(
        (yearDigits): Year => ({ year: yearDigits.join("") }),
        sequence(singleDigit(), singleDigit(), singleDigit(), singleDigit()),
    );

    const monthParser = map(
        (monthDigits): Month => ({ month: monthDigits.join("") }),
        sequence(singleDigit(), singleDigit()),
    );

    const dayParser = map(
        (dayDigits): Day => ({ day: dayDigits.join("") }),
        sequence(singleDigit(), singleDigit()),
    );

    const dateSeparator = oneOf(exact("-"), exact("/"));

    const simpleDateParser = map(
        ([year, , month, , day]): DateObject => ({ ...year, ...month, ...day }),
        sequence(
            yearParser,
            dateSeparator,
            monthParser,
            dateSeparator,
            dayParser,
        ),
    );

    const simpleOkCases: Array<[string, DateObject]> = [
        ["2021-03-26", { year: "2021", month: "03", day: "26" }],
        ["2021/03/26", { year: "2021", month: "03", day: "26" }],
        ["2021-03/26", { year: "2021", month: "03", day: "26" }],
        ["2021/03-26", { year: "2021", month: "03", day: "26" }],
    ];

    test.each(simpleOkCases)(
        "Parses dates from '%s', but does not enforce separator consistency",
        (source, matche) => {
            const result = simpleDateParser.parse(source);
            switch (result.variant) {
                case Result.Variant.Ok:
                    expect(result.value.parsed).toEqual(matche);
                    break;

                case Result.Variant.Err:
                    fail(result.error);
            }
        },
    );

    const dateParser = map(
        ([year, [, month, , day]]): DateObject => ({
            ...year,
            ...month,
            ...day,
        }),
        sequence(
            yearParser,
            oneOf(
                sequence(exact("/"), monthParser, exact("/"), dayParser),
                sequence(exact("-"), monthParser, exact("-"), dayParser),
            ),
        ),
    );

    const okCases: Array<[string, DateObject]> = [
        ["2021-03-26", { year: "2021", month: "03", day: "26" }],
        ["2021/03/26", { year: "2021", month: "03", day: "26" }],
    ];

    test.each(okCases)("Parses dates from '%s'", (source, matche) => {
        const result = dateParser.parse(source);
        switch (result.variant) {
            case Result.Variant.Ok:
                expect(result.value.parsed).toEqual(matche);
                break;

            case Result.Variant.Err:
                fail(result.error);
        }
    });

    const errCases: Array<[string, string]> = [
        [
            "2021-03/26",
            'Error at (line: 1, column: 8)\nExpected "-" but got "/" instead\n\n2021-03/26\n       ^',
        ],
        [
            "2021/03-26",
            'Error at (line: 1, column: 5)\nExpected "-" but got "/" instead\n\n2021/03-26\n    ^',
        ],
    ];

    test.each(errCases)("Does not parse date in '%s'", (source, errMessage) => {
        const result = dateParser.parse(source);
        switch (result.variant) {
            case Result.Variant.Err:
                expect(result.error.message).toBe(errMessage);
                break;

            case Result.Variant.Ok:
                console.log(result);
                fail("Should not have parsed");
        }
    });
});

describe("simple regular expression for phone numbers", () => {
    // from: https://ihateregex.io/expr/phone
    // [\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}

    type PhoneStart = { startBit: string };
    type PhoneMiddle = { middleBit: string };
    type PhoneEnd = { endBit: string };

    type PhoneDescription = PhoneStart & PhoneMiddle & PhoneEnd;

    const parser = map(
        ([, , start, , , middle, , end]): PhoneDescription => ({
            ...start,
            ...middle,
            ...end,
        }),
        sequence(
            maybe(exact("+")),
            maybe(exact("(")),
            map(
                (start): PhoneStart => ({ startBit: start.join("") }),
                sequence(singleDigit(), singleDigit(), singleDigit()),
            ),
            maybe(exact(")")),
            maybe(oneOf(exact("-"), exact("."), exact(" "))),
            map(
                (middle): PhoneMiddle => ({ middleBit: middle.join("") }),
                sequence(singleDigit(), singleDigit(), singleDigit()),
            ),
            maybe(oneOf(exact("-"), exact("."), exact(" "))),
            map(
                (end): PhoneEnd => ({ endBit: end.join("") }),
                sequence(
                    singleDigit(),
                    singleDigit(),
                    singleDigit(),
                    singleDigit(),
                    optional(singleDigit(), ""),
                    optional(singleDigit(), ""),
                ),
            ),
        ),
    );

    const okCases: Array<[string, PhoneDescription]> = [
        [
            "+919367788755",
            { startBit: "919", middleBit: "367", endBit: "788755" },
        ],
        ["8989829304", { startBit: "898", middleBit: "982", endBit: "9304" }],
        [
            "+16308520397",
            { startBit: "163", middleBit: "085", endBit: "20397" },
        ],
        ["786-307-3615", { startBit: "786", middleBit: "307", endBit: "3615" }],
        [
            "+(123).456.78910",
            { startBit: "123", middleBit: "456", endBit: "78910" },
        ],
    ];

    test.each(okCases)("Parses phone number from '%s'", (source, matches) => {
        const result = parser.parse(source);
        switch (result.variant) {
            case Result.Variant.Ok:
                expect(result.value.parsed).toEqual(matches);
                break;

            case Result.Variant.Err:
                fail(result.error);
        }
    });

    const errCases: Array<string> = ["789", "123765", "1-1-1", "+982"];

    test.each(errCases)("Does not match phone number '%s'", (source) => {
        const result = parser.parse(source);
        switch (result.variant) {
            case Result.Variant.Err:
                break;

            case Result.Variant.Ok:
                console.log(result);
                fail("Should not have parsed");
        }
    });
});
