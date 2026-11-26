# Return a supplied proof

[Working code](Example.lean) · [Notes](Notes.md)

Suppose that `P : Prop` and that `h : P` is supplied. The declaration of `P`
identifies a proposition; the declaration of `h` supplies a proof of it.
The goal `P` can therefore be met by using the available term `h`.

```lean
theorem identity_proof (P : Prop) (h : P) : P := h
```

The whole theorem receives both parameters. Its type can be read as
`(P : Prop) → P → P`: for every proposition, a supplied proof is returned as a
proof of that same proposition. This construction gives no way to obtain a
proof of an arbitrary proposition without the supplied argument.

Hover over `h` in the native Lean editor to inspect its type. Use **MRW: Lean
Study Actions…** to open the referenced book section or the associated note.
This is a complete external content example for the installed Lean integration.
