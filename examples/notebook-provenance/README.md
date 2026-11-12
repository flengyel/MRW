# Two calculations of a quadratic discriminant

Let $K=\mathbb Q(\sqrt5)$ and $\beta=(1+\sqrt5)/2$. The field trace
$\operatorname{Tr}_{K/\mathbb Q}(a)$ is the sum of $a$ and its conjugate, obtained by replacing $\sqrt5$ by $-\sqrt5$.
For a basis $(b_1,b_2)$ of $K$ over $\mathbb Q$, its discriminant is
$\det(\operatorname{Tr}_{K/\mathbb Q}(b_i b_j))_{i,j=1}^2$.

The first notebook uses the basis $(1,\beta)$. Since $\beta^2=\beta+1$,
its trace matrix is
$$
\begin{pmatrix}2&1\\1&3\end{pmatrix}.
$$
Its determinant is $5$.

The second notebook uses the minimal polynomial $p(t)=t^2-t-1$ of $\beta$; this quadratic is irreducible over $\mathbb Q$ because it has no rational root.
The resultant $\operatorname{Res}(p,p')$ is the determinant of the Sylvester
matrix of $p$ and its derivative. For a monic quadratic, the discriminant of
its root basis is $-\operatorname{Res}(p,p')$. This calculation also gives $5$.
These are two methods for the same basis, not two independent proofs of the
resultant identity.

The choice of basis matters. The basis $(1,\sqrt5)$ instead has trace matrix
$\operatorname{diag}(2,10)$ and discriminant $20$. Thus comparing the two
notebooks requires checking their basis as well as their numerical outputs.

The failed notebook tries to construct a number field from $(t-1)^2$. Sage
rejects this reducible polynomial. A zero polynomial discriminant is not the
discriminant of a quadratic number field.

## Run and retain

These are ordinary notebooks. Open `trace.ipynb` or `resultant.ipynb` with the
Sage kernel, run and save it, then use **MRW: Retain Notebook Result…**. Include
this note as a companion if useful. Saved outputs alone leave execution context
unknown. MRW does not start a kernel or assert that saved outputs match current
code.

For a producer-reported execution account, explicitly run the supplied helper
in an environment with Sage, nbclient and nbformat:

```sh
sage -python record_run.py trace.ipynb trace-run.ipynb
sage -python record_run.py resultant.ipynb resultant-run.ipynb
sage -python record_run.py failed.ipynb failed-run.ipynb
```

The last command returns 1 and still saves the cell error. Each invocation uses
a fresh kernel and writes a new file. Retain those `*-run.ipynb` files. The
receipt records code, outputs, times, outcome and available versions. It is a
producer's report; MRW checks its consistency but does not authenticate it.
The code records Sage's version in its output. These examples use no random seed
or external dataset.

Use **Open Retained Notebook Result…** to reopen, compare, read the companion,
copy a result link or delete a retained copy. **Export Notebook Provenance…**
can export both accounts together. Opening, comparison and export run no code.
