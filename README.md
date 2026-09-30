# TS Combinator

Simple but Powerful Parser Combinator library in pure TypeScript

1. [Getting Started](#getting-started)
    1. [Installation](#installation)
    2. [Basic Example](#basic-example)
    3. [Documentation](#documentation)
2. [Features](#features)
3. [Motivation](#motivation)
4. [Advanced Usage](#advanced-usage)
5. [Terminology](#terminology)
6. [Changelog](#changelog)

## Getting Started

### Installation

This package is available on npm and GitHub packages.

```sh
npm install @jessejenks/ts-combinator
```

### Basic Example

We can define a semantic version string parser in just a few lines.

```ts
import { Parser } from "@jessejenks/ts-combinator";
const { digits, exact, map, oneOf, sequence, succeed, end } = Parser;

type Version = {
    operator: "^" | "~" | null;
    major: number;
    minor: number | "x" | "*";
    patch: number | "x" | "*";
};

const versionParser: Parser<Version> = map(
    ([operator, major, , minor, , patch]): Version => ({
        operator,
        major,
        minor,
        patch,
    }),
    sequence(
        oneOf(exact("^"), exact("~"), succeed(null)),
        map(parseInt, digits()),
        exact("."),
        oneOf(map(parseInt, digits()), exact("x"), exact("*")),
        exact("."),
        oneOf(map(parseInt, digits()), exact("x"), exact("*")),
        end(),
    ),
);
```

```ts
versionParser.parse("1.0.0");
// { operator: null, major: 1, minor: 0, patch: 0 }
versionParser.parse("^2.*.x");
// { operator: "^", major: 2, minor: "*", patch: "x" }

versionParser.parse("~a.b.c");
// Error at (line: 1, column: 2)
// Expected digits but got "a" instead
//
// ~a.b.c
//  ^
versionParser.parse("^2.x");
// Error at (line: 1, column: 5)
// Expected "." but got end of input instead
//
// ^2.x
//     ^
versionParser.parse("1.0.0 extra");
// Error at (line: 1, column: 6)
// Expected end of input but got " extra" instead
//
// 1.0.0 extra
//      ^
```

### Documentation

Full documentation is available with `typedoc` and can be built by running

```sh
npm run doc
```

## Features

The goal of this project is to make simple, powerful parsers more readable and
declarative.

There are many techniques for writing parsers, but what makes combinators so
powerful is
- Readability
- Reusability
- The ability to transform while matching

This library is capable of parsing languages which cannot normally be parsed by
regular expressions.

This library is partly inspired by Haskell's Parsec and Elm's parser libraries.
It supports a full Pratt-style parser for simple operator precedence parsing.

See the [Examples directory](./Examples/) for more complex examples.

## Motivation

### Why not RegExp?

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

But we have introduced a small problem. Now we match strings like `"2021-03/26"`
and `"2021/03-26"`! Maybe this is ok and maybe it isn't. How would we update our
regular expression to make sure these are not accepted?

```ts
const re = /^(\d{4})((-(\d{2})-(\d{2}))|(\/(\d{2})\/(\d{2})))/;
function parseDate(source: string) {
    const match = re.exec(source);
    if (match === null) {
        return null;
    }

    const [, year, , , dashMonth, dashDay, , slashMonth, slashDay] = match;
    return { year, month: dashMonth || slashMonth, day: dashDay || slashDay };
}
```

Now we really have a maintenance problem.

The situation can be improved somewhat with an explicit `RegExp` constructor and
template strings. Something like this.

```ts
const year = /\d{4}/.source;
const month = /\d{2}/.source;
const day = /\d{2}/.source;
const re = new RegExp(`^(${year})((-(${month})-(${day}))|(\\/(${month})\\/(${day})))`)
```

But what happens if we want to support more separators? How much time would we
spend trying to figure out how this works in a year from now?

Now compare this to using `ts-combinator`.

Here is the simpler date parser that matches `"2021-03-26"` and `"2021/03/26"`,
but also `"2021-03/26"`.

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
dateParser.parse("2021-03/26");
// Error at (line: 1, column: 8)
// Expected "-" but got "/" instead
//
// 2021-03/26
//        ^
```

As written, we can sometimes get misleading errors due to the backtracking
nature of `oneOf`.

```js
dateParser.parse("2021/03-26");
// Error at (line: 1, column: 5)
// Expected "-" but got "/" instead
//
// 2021/03-26
//     ^
```

This makes it seem like the parser *only* accepts dash delimiters.

We can also get finer control over parsing and error messages with the
`conditional` combinator. See the [Conditionals](./Conditionals.md)
documentation for more details.

```ts
const dateParser = map(
    ([year, [, [month, , day]]]): DateObject => ({ ...year, ...month, ...day }),
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
```

This small change prevents backtracking once we commit to a path, giving us a
clearer error message.

```js
dateParser.parse("2021/03-26");
// Error at (line: 1, column: 8)
// Expected "/" but got "-" instead
//
// 2021/03-26
//        ^
```

## Advanced Usage

Combinator style parsers are capable of parsing a large variety of languages.
For instance, a standard example of a context-free language is the
[Dyck language](./Examples/ContextFreeLanguages.test.ts). But we can parse at
least some
[context-sensitive languages](./Examples/ContextSensitiveLanguage.test.ts) too.

A more concrete example. We can implement a simple boolean language parser and
interpreter in just a few lines.

```ts
const left = oneOf(
    map(() => true, exact("true")),
    map(() => false, exact("false")),
);
const infix = oneOf(
    toBinaryOperator(exact("or"), [1, 2]),
    toBinaryOperator(exact("and"), [3, 4]),
);
const prefix = toUnaryOperator(exact("not"), 5);
const scopeBegin = exact("(");
const scopeEnd = exact(")");

const exprInterpreter = pratt(left, {
    infix: {
        op: infix,
        acc: (symbol, left, right) =>
            symbol === "and" ? left && right : left || right,
    },
    prefix: {
        op: prefix,
        acc: (symbol, right) => !right,
    },
    scope: {
        scopeBegin,
        scopeEnd,
    },
});
```

Which can already parse arbitrary boolean expressions

```ts
exprInterpreter.parse("true and false or not false and (true or false)")
// parsed as
// (true and false) or ((not false) and (true or false))
// and correctly evaluates to
// true
```

## Terminology

A combinator is a (usually higher-order) function which only refers to its
arguments.

For example
```js
const apply = (f, x) => f(x);
```

is a combinator. But something like

```js
const apply = (f, x) => f(x, y);
```

is not, since `y` is not an argument of `apply`.

A famous example is the Y-combinator.

```js
const y = f => (x => f(x(x)))(x => f(x(x)));
```

or the Z-combinator

```js
const z = f => (x => f(v => x(x)(v)))(x => f(v => x(x)(v)));
```

However, I use the term "combinator" quite loosely, since the point of using
TypeScript is to get both the benefits of parser combinators, while still having
the flexibility of writing functions which are not technically combinators.

## Changelog

### [Unreleased]
#### Changed
- Small improvement to error messages at end of input.

### [3.3.1] : 2026-08-05
#### Added
- Adds type level tests with `expect-type`.

### [3.3.0] : 2026-02-23
#### Added
- Adds `validate`

#### Changed
- Allows `spaces` to accept parameter to require whitespace characters

### [3.2.0] : 2026-02-20
#### Added
- Adds Pratt parsing

### [3.1.1] : 2026-02-12
#### Changed
- Updated rollup config

### [3.1.0] : 2026-02-11

#### Added
- `end` and `completely` combinators.

#### Changed
- Upgraded dependencies
- Made package type "module"

### [3.0.0] : 2021-05-21

#### Added
- Conditional parser

#### Changed
- Updates to index-based system
- Adds better error messages
- Parse result format

### [2.2.0] : 2021-04-02

#### Added
- documentation

### [2.1.0] : 2021-04-01

#### Added
- `lazy` combinator
- Casing converter example

### [2.0.0] : 2021-04-01

#### Added
- `Maybe` type
- proper `maybe` combinator

#### Changed
- Renamed `maybe` to `optional`

### [1.0.0] : 2021-03-27

#### Added
- Number parsers
- `maybe` combinator

#### Changed
- Updated changelog section to match format from
  ["keep a changelog"](https://keepachangelog.com/en/1.0.0/)

### [0.1.0] : 2021-03-26

#### Added
- Changelog
- Initial release!
- Some atomic parsers
- Basic Combinators to parse regular languages

[Unreleased]: https://github.com/jessejenks/ts-combinator/compare/v3.3.1...HEAD
[3.3.1]: https://github.com/jessejenks/ts-combinator/releases/tag/v3.3.1
[3.3.0]: https://github.com/jessejenks/ts-combinator/releases/tag/v3.3.0
[3.2.0]: https://github.com/jessejenks/ts-combinator/releases/tag/v3.2.0
[3.1.1]: https://github.com/jessejenks/ts-combinator/releases/tag/v3.1.1
[3.1.0]: https://github.com/jessejenks/ts-combinator/releases/tag/v3.1.0
[3.0.0]: https://github.com/jessejenks/ts-combinator/releases/tag/v3.0.0
[2.2.0]: https://github.com/jessejenks/ts-combinator/releases/tag/v2.2.0
[2.1.0]: https://github.com/jessejenks/ts-combinator/releases/tag/v2.1.0
[2.0.0]: https://github.com/jessejenks/ts-combinator/releases/tag/v2.0.0
[1.0.0]: https://github.com/jessejenks/ts-combinator/releases/tag/v1.0.0
[0.1.0]: https://github.com/jessejenks/ts-combinator/releases/tag/v0.1.0