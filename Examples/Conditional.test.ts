import { Result } from "../src/Result";
import { Parser } from "../src/Parser";

const { singleDigit, alpha, exact, map, sequence, conditional, oneOf } = Parser;

describe("simple example", () => {
    const basicParser = map(
        ([, word]) => word,
        oneOf(
            sequence(exact(">>"), alpha(), exact(">>")),
            sequence(exact("<<"), alpha(), exact("<<")),
        ),
    );

    const errCases = [
        [
            ">>hello<<",
            'Error at (line: 1, column: 1)\nExpected "<<" but got ">>" instead\n\n>>hello<<\n^',
        ],
        [
            ">>hello123",
            'Error at (line: 1, column: 1)\nExpected "<<" but got ">>" instead\n\n>>hello123\n^',
        ],
    ];

    test.each(errCases)("Does not parse '%s'", (source, errMessage) => {
        const result = basicParser.parse(source);
        switch (result.variant) {
            case Result.Variant.Err:
                expect(result.error.message).toBe(errMessage);
                break;

            case Result.Variant.Ok:
                fail("Should not have parsed");
        }
    });

    const conditionalParser = map(
        ([, [word]]) => word,
        oneOf(
            conditional(exact(">>"), sequence(alpha(), exact(">>"))),
            conditional(exact("<<"), sequence(alpha(), exact("<<"))),
        ),
    );

    const conditionalErrCases = [
        [
            ">>hello<<",
            'Error at (line: 1, column: 8)\nExpected ">>" but got "<<" instead\n\n>>hello<<\n       ^',
        ],
        [
            ">>hello123",
            'Error at (line: 1, column: 8)\nExpected ">>" but got "12" instead\n\n>>hello123\n       ^',
        ],
    ];

    test.each(conditionalErrCases)(
        "Does not parse '%s' with better error messages",
        (source, errMessage) => {
            const result = conditionalParser.parse(source);
            switch (result.variant) {
                case Result.Variant.Err:
                    expect(result.error.message).toBe(errMessage);
                    break;

                case Result.Variant.Ok:
                    fail("Should not have parsed");
            }
        },
    );
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
                fail("Should not have parsed");
        }
    });

    const conditionalErrCases: Array<[string, string]> = [
        [
            "2021-03/26",
            'Error at (line: 1, column: 8)\nExpected "-" but got "/" instead\n\n2021-03/26\n       ^',
        ],
        [
            "2021/03-26",
            'Error at (line: 1, column: 8)\nExpected "/" but got "-" instead\n\n2021/03-26\n       ^',
        ],
    ];

    const conditionalDateParser = map(
        ([year, [, [month, , day]]]): DateObject => ({
            ...year,
            ...month,
            ...day,
        }),
        sequence(
            yearParser,
            oneOf(
                conditional(
                    exact("/"),
                    sequence(monthParser, exact("/"), dayParser),
                ),
                conditional(
                    exact("-"),
                    sequence(monthParser, exact("-"), dayParser),
                ),
            ),
        ),
    );

    test.each(okCases)("still parses dates from '%s'", (source, matche) => {
        const result = conditionalDateParser.parse(source);
        switch (result.variant) {
            case Result.Variant.Ok:
                expect(result.value.parsed).toEqual(matche);
                break;

            case Result.Variant.Err:
                fail(result.error);
        }
    });

    test.each(conditionalErrCases)(
        "Does not parse date in '%s', but with better error message",
        (source, errMessage) => {
            const result = conditionalDateParser.parse(source);
            switch (result.variant) {
                case Result.Variant.Err:
                    expect(result.error.message).toBe(errMessage);
                    break;

                case Result.Variant.Ok:
                    fail("Should not have parsed");
            }
        },
    );
});
