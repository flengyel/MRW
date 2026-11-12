# Review of the quadratic discriminant note

The mathematical prose in `examples/notebook-provenance/README.md` was reviewed
using the Mathematical Writing skill and Knuth, Larrabee and Roberts,
[*Mathematical Writing*, §1](https://www-cs-faculty.stanford.edu/~knuth/papers/cs1193.pdf).
The governing checks were definitions at first use, explicit hypotheses and
notation, connected prose, and a reason for each calculation. The user's
requested economical style is followed without compressing away the basis choice.

The note has five mathematical steps: define the field and trace; define basis
discriminant; compute the trace matrix; identify the resultant method for the same
basis; explain the different basis and the failed field construction. Execution
instructions follow the mathematics in a separate section.

The definition order is K and beta, conjugation and trace, basis discriminant,
minimal polynomial, derivative and resultant. Both bases and their ambient field
are explicit. The resultant formula is stated as a used identity, not claimed as
proved by agreeing outputs. The two methods give 5; changing to (1, sqrt(5)) gives
20. A repeated-root polynomial is rejected as a field presentation, rather than
treated as another quadratic field. No new mathematical claim is inferred from
provenance validation.

A full pass through this short note found no need for a diagram, additional
terminology or a separate exercise form. The code and ordinary explanatory note
remain separate artifacts with their exact revisions retained together.
