# Trace in a larger field

Let $K/\mathbb Q$ be a finite field extension and let $\alpha\in K$.
The field trace $\mathrm{Tr}_{K/\mathbb Q}(\alpha)$ is the trace of
the $\mathbb Q$-linear map

$$
\mu_\alpha:K\longrightarrow K,\qquad x\longmapsto\alpha x.
$$

## A coefficient is not enough

For $\alpha=1$ in $K=\mathbb Q(\sqrt2)$, multiplication by $\alpha$
is the identity on a two-dimensional vector space, so its trace is $2$.
The minimal polynomial of $1$ over $\mathbb Q$ is $T-1$.
Its negative constant coefficient is $1$.
Thus the next coefficient of the minimal polynomial alone does not give the
trace in a larger field.

## The degree factor

Let $F=\mathbb Q(\alpha)$, let $d=[F:\mathbb Q]$, and write the minimal
polynomial of $\alpha$ over $\mathbb Q$ as

$$
m_\alpha(T)=T^d+\sum_{i=0}^{d-1}c_iT^i.
$$

Then

$$
\mathrm{Tr}_{K/\mathbb Q}(\alpha)
=-[K:F]\,c_{d-1}.
$$

When $K=F$, the factor $[K:F]$ is $1$.

The [multiplication-matrix proof](matrix.md#the-repeated-blocks) explains
the factor: each basis vector of $K$ over $F$ contributes one copy of
the same block.

This is the trace formula in the Stacks Project,
[Lemma 9.20.3, stacks-project:0BIH](https://stacks.math.columbia.edu/tag/0BIH).

## A quadratic element in a degree-four field

Take $K=\mathbb Q(\sqrt2,\sqrt3)$ and $\alpha=1+\sqrt2$.
Here $F=\mathbb Q(\sqrt2)$ and $[K:F]=2$. Indeed, an identity
$\sqrt3=a+b\sqrt2$ with $a,b\in\mathbb Q$ would force $ab=0$;
neither $3$ nor $3/2$ is a rational square.
The minimal polynomial is

$$
m_\alpha(T)=(T-1)^2-2=T^2-2T-1.
$$

In the ordered $\mathbb Q$-basis
$(1,\alpha,\sqrt3,\alpha\sqrt3)$ of $K$, multiplication by $\alpha$
has matrix

$$
\begin{pmatrix}C&0\\0&C\end{pmatrix},
\qquad
C=\begin{pmatrix}0&1\\1&2\end{pmatrix}.
$$

Thus its trace is $4$. The coefficient alone gives $2$.

## An exact SageMath calculation

Put $s=\sqrt2+\sqrt3$. Then $s^4-10s^2+1=0$ and
$\sqrt2=(s^3-9s)/2$. The following calculation uses the power basis of
$\mathbb Q(s)$; trace is independent of the chosen basis.

```python
from sage.all import QQ, PolynomialRing, NumberField

R = PolynomialRing(QQ, "x")
x = R.gen()
K = NumberField(x**4 - 10*x**2 + 1, "s")
s = K.gen()
alpha = 1 + (s**3 - 9*s)/2
f = alpha.minpoly()
r = K.degree() // f.degree()

assert K.degree() == 4
assert f == x**2 - 2*x - 1
assert r == 2
assert alpha.trace() == -r*f[f.degree()-1] == 4
assert alpha.charpoly() == f**r
```

The characteristic polynomial is $T^4-4T^3+2T^2+4T+1$.
This calculation checks the displayed example; the argument for arbitrary
finite extensions is the linked proof.
