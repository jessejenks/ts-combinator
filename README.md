# TS Combinator

Simple Typescript Parser Combinator library

## Goals

The goal of this project is to make simple parsers more readable and
declarative. No more indexing into a `RegExpExecArray` and hope you grabbed the
right group.

So far, this library is powerful enough to match arbitrary regular languages.
But this is not a high bar. What make parser combinators so powerful (in my
mind) are
- the ability to _transform while matching_
- Readability
- Reusability

## Motivation

Consider this simple example with date strings.

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

But now suppose we want to match not just dates like "2021-03-26", but also
dates like "2021/03/26".

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

Just a little bit harder to read, but ok fine.

But we have introduces a small problem. Now we match strings like "2021-03/26"
and "2021/03-26"! Maybe this is ok and maybe it isn't. How would we update our
regular expression now?

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

Ah yes, of course.

The situation can be improved somewhat with an explicit `RegExp` constructor and
template strings.

```ts
const year = /\d{4}/;
const month = /\d{2}/;
const day = /\d{2}/;
const re =  new RegExp(`^(${year.source})((-(${month.source})-(${day.source}))|(\\/(${month.source})\\/(${day.source})))`)
```

But what happens if we want to support more separators? How much time would we
spend trying to figure out how this works in a year from now?

---

Now compare this to using `ts-combinator`.

Here is the "simple" date parser that matched "2021-03-26" and "2021/03/26", but
also "2021-03/26".

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
        ([year, [, month, , day]]): DateObject => ({
            ...year,
            ...month,
            ...day,
        }),
        sequence(
            yearParser,
            oneOf(
                sequence(exact("-"), monthParser, exact("-"), dayParser),
                sequence(exact("/"), monthParser, exact("/"), dayParser),
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
    ([year, [, month, , day]]): DateObject => ({
        ...year,
        ...month,
        ...day,
    }),
    sequence(
        yearParser,
        oneOf(
            monthDayWithSeparator(exact("-"), monthParser, dayParser),
            monthDayWithSeparator(exact("/"), monthParser, dayParser),
            monthDayWithSeparator(exact(":"), monthParser, dayParser),
        ),
    ),
);
```

Finally, the best part is that when a match fails, instead of just `null`, we
actually get an error message like
```
'Expected "-" but got "/" instead'
```

# Terminology

I am using "combinator" quite loosely here, since the goal in using TypeScript
is to take advantage of the benefits of parser combinators, while still having
the flexibility of writing functions which are not technically combinators. But
what is a combinator is a (usually higher-order) function which only refers to
its arguments.

For example
```js
const eval = (f, x) => f(x);
```

is a combinator. But something like

```js
const eval = (f, x) => f(x, y);
```

is not.


A famous example is the "Y-combinator".

```js
const y = f => (x => f(x(x)))(x => f(x(x)));
```

So combinators are necessarily pure functions. However, it is often useful to
write pure functions which refer to other variables available in the current
scope. For example

```js
function cleanInput(x) { /* ... */ }
const eval = (f, x) => f(cleanInput(x));
```

As long as `cleanInput` is pure, `eval` will be pure. But now `eval` is not a
combinator. Instead, this is a pure [closure](https://whatthefuck.is/closure).

# Changelog
## [0.1.0][v0.1.0] : 2021-03-26
- Added changelog!
- Initial release

[v0.1.0]: https://github.com/jessejenks/ts-combinator/releases/tag/v0.1.0