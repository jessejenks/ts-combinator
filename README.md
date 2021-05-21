# TS Combinator

Simple Typescript Parser Combinator library

## Goals

The goal of this project is to make simple parsers more readable and
declarative. No more indexing into a `RegExpExecArray` and hope you grabbed the
right group.

There are many techniques for writing parsers, but what make parser combinators
so powerful are
- Readability
- Reusability
- the ability to transform while matchings

Finally, this library is capable of parsing languages which cannot normally be
parsed by regular expressions.

## Motivation

Consider this simple example with date strings. We want to match dates in the
`YYYY-MM-DD` format. Using regular expressions we might write something like the
following.

```ts
const re = /^(\d{4})-(\d{2})-(\d{2})/
function parseDate(source: string) {
    const match = re.exec(source);
    if (match === null) {
        return null;
    }

    const [, year, month, day] = match;
    return { year, month, day }
}
```

This is fairly readable and maintainable.

But now suppose we want to match not just dates like `"2021-03-26"`, but also
dates like `"2021/03/26"`.

Ok no problem, just a small update.

```ts
const re = /^(\d{4})(-|\/)(\d{2})(-|\/)(\d{2})/
function parseDate(source: string) {
    const match = re.exec(source);
    if (match === null) {
        return null;
    }

    const [, year, , month, , day] = match;
    return { year, month, day }
}
```

A little bit harder to read, but still ok.

But we have introduces a small problem. Now we match strings like `"2021-03/26"`
and `"2021/03-26"`! Maybe this is ok and maybe it isn't. How would we update our
regular expression to make sure these are not accepted?

```ts
const re = /^(\d{4})((-(\d{2})-(\d{2}))|(\/(\d{2})\/(\d{2})))/;
function parseDate(source) {
    const match = re.exec(source);
    if (match === null) {
        return null;
    }

    const [, year, , , dashMonth, dashDay, , slashMonth, slashDay] = match;
    return { year, month: dashMonth || slashMonth, day: dashDay || slashDay };
}
```

Now we really have a maintainance problem.

The situation can be improved somewhat with an explicit `RegExp` constructor and
template strings. Something like this.

```ts
const year = /\d{4}/.source;
const month = /\d{2}/.source;
const day = /\d{2}/.source;
const re =  new RegExp(`^(${year})((-(${month})-(${day}))|(\\/(${month})\\/(${day})))`)
```

But what happens if we want to support more separators? How much time would we
spend trying to figure out how this works in a year from now?

---

Now compare this to using `ts-combinator`.

Here is the simpler date parser that matched `"2021-03-26"` and `"2021/03/26"`, but
also `"2021-03/26"`.

```ts
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

const simpleDateParser = map(
    ([year, , month, , day]): DateObject => ({ ...year, ...month, ...day }),
    sequence(
        yearParser,
        oneOf(exact("-"), exact("/")),
        monthParser,
        oneOf(exact("-"), exact("/")),
        dayParser,
    ),
);
```

With the `map` function, we can transform as we match and we get type safety
practically for free!

And the more complex date parser that ensures separator consistency?

```ts
const dateParser = map(
    ([year, [, month, , day]]): DateObject => ({ ...year, ...month, ...day }),
    sequence(
        yearParser,
        oneOf(
            sequence(exact("/"), monthParser, exact("/"), dayParser),
            sequence(exact("-"), monthParser, exact("-"), dayParser),
        ),
    ),
);

```

And adding new separators?

We can write our own combinator!

```ts
const monthDayWithSeparator = (
    sep: Parser<string>,
    month: Parser<Month>,
    day: Parser<Day>,
) => sequence(sep, month, sep, day);

const dateParser = map(
    ([year, [, month, , day]]): DateObject => ({ ...year, ...month, ...day }),
    sequence(
        yearParser,
        oneOf(
            monthDayWithSeparator(exact(":"), monthParser, dayParser),
            monthDayWithSeparator(exact("/"), monthParser, dayParser),
            monthDayWithSeparator(exact("-"), monthParser, dayParser),
        ),
    ),
);
```

Finally, the best part is that when a match fails, instead of just `null`, we
can get nicer error messages.
```js
dateParser.parse("2021-03/27");
// Error at (line: 1, column: 8)
// Expected "-" but got "/" instead
// 
// 2021-03/26
//        ^
```

We can also get finer control over parsing and error messages with the
`conditional` combinator. See the [Conditionals](./Conditionals.md) documentat
for more details.

# Terminology

A combinator is a (usually higher-order) function which only refers to its
arguments.

For example
```js
const eval = (f, x) => f(x);
```

is a combinator. But something like

```js
const eval = (f, x) => f(x, y);
```

is not, since `y` is not an argument of `eval`.


A famous example is the "Y-combinator".

```js
const y = f => (x => f(x(x)))(x => f(x(x)));
```

However, I use the term "combinator" quite loosely, since the point of using
TypeScript is to get both the benefits of parser combinators, while still having
the flexibility of writing functions which are not technically combinators.

# Changelog

## [Unreleased]

## [3.0.0] : 2021-05-21

## Added
- Conditional parser

## Changed
- Updates to index-based system
- Adds better error messages
- Parse result format

## [2.2.0] : 2021-04-02

### Added
- documentation

## [2.1.0] : 2021-04-01

### Added
- `lazy` combinator
- Casing converter example

## [2.0.0] : 2021-04-01

### Added
- `Maybe` type
- proper `maybe` combinator

### Changed
- Renamed `maybe` to `optional`

## [1.0.0] : 2021-03-27

### Added
- Number parsers
- `maybe` combinator

### Changed
- Updated changelog section to match format from
  ["keep a changelog"](https://keepachangelog.com/en/1.0.0/)

## [0.1.0] : 2021-03-26

### Added
- Changelog
- Initial release!
- Some atomic parsers
- Basic Combinators to parse regular languages

[Unreleased]: https://github.com/jessejenks/ts-combinator/compare/v3.0.0...HEAD
[3.0.0]: https://github.com/jessejenks/ts-combinator/releases/tag/v3.0.0
[2.2.0]: https://github.com/jessejenks/ts-combinator/releases/tag/v2.2.0
[2.1.0]: https://github.com/jessejenks/ts-combinator/releases/tag/v2.1.0
[2.0.0]: https://github.com/jessejenks/ts-combinator/releases/tag/v2.0.0
[1.0.0]: https://github.com/jessejenks/ts-combinator/releases/tag/v1.0.0
[0.1.0]: https://github.com/jessejenks/ts-combinator/releases/tag/v0.1.0