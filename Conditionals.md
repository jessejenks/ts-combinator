# Conditional Branching

## Example

Suppose we want to parse things like `">>hello>>"` or `"<<hello<<"`, but not
`">>hello<<"` or `"<<hello>>"`. The following parsers will accept the same
strings (though the parsed format is slightly different).

```ts
const parser = oneOf(
    sequence(exact(">>"), alpha(), exact(">>")),
    sequence(exact("<<"), alpha(), exact("<<")),
);

const conditionalParser = oneOf(
    conditional(exact(">>"), sequence(alpha(), exact(">>"))),
    conditional(exact("<<"), sequence(alpha(), exact("<<"))),
)
```

Both parsers will accept `">>hello>>"` and `"<<hello<<"`, but reject
`">>hello<<"` and `"<<hello>>"`.

When trying to parse `">>hello<<"` the error message from `parser` is

```
Error at (line: 1, column: 1)
Expected "<<" but got ">>" instead

>>hello<<
^
```

while the error message from `conditionalParser` is
```
Error at (line: 1, column: 8)
Expected ">>" but got "<<" instead

>>hello<<
       ^
```

The difference is clearer when trying to parse `">>hello123"`.

`parser` will say

```
Error at (line: 1, column: 1)
Expected "<<" but got ">>" instead

>>hello123
^
```

but `conditionalParser` says
```
Error at (line: 1, column: 8)
Expected ">>" but got "12" instead

>>hello123
       ^
```

## Why does this happen?

The two key pieces are the following.

1. The `oneOf` parser will try a list of parsers in a given order. If one
   parser fails, it moves on to the next one.
2. The `sequence` parser tries a list of parsers in a given order. But if
   one parser fails, the whole sequence fails.

In the case of `">>hello123"`,

1. The `oneOf` parser tries the first `sequence`
2. In the first `sequence`, try `exact(">>")`
3. This succeeds, so parse `"hello"`
4. Not try `exact(">>")` again
5. This fails since we read `12`, so `sequence` fails
6. Now, `oneOf` tries the next sequence
7. In the second `sequence`, try `exact("<<")`
8. This fails so the sequence fails
9. Since all options failed, `oneOf` fails

## The Solution

The conditional parser tells the oneOf parser not to move onto the next option
if the first parser succeeds but second one fails. This is done by attaching
information to the error object. This is not propagated up, so parsers with
nested `oneOf`s will still behave as expected.