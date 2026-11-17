# Bases and the field discriminant

Let $K=\mathbb{Q}(\sqrt5)$ and $\beta=(1+\sqrt5)/2$.
The [trace calculation](README.md) gives discriminants $5$ for $(1,\beta)$
and $20$ for $(1,\sqrt5)$. Which is the field discriminant?

## The ring of integers

An element is an algebraic integer if it satisfies a monic polynomial in
$\mathbb{Z}[T]$. The ring of integers $\mathcal O_K$ consists of these elements
in $K$. We prove that $\mathcal O_K=\mathbb{Z}+\mathbb{Z}\beta$.

Let $\alpha=(u+v\sqrt5)/2$ be integral, with $u,v\in\mathbb{Q}$.
Its trace and norm are integers, so
$$
u\in\mathbb{Z},\qquad u^2-5v^2=4n
$$
for some $n\in\mathbb{Z}$. Write $v=p/q$ in lowest terms, with $q>0$.
Then $q^2$ divides $5p^2$, hence divides $5$. Thus $q=1$.
Reduction modulo $4$ shows that $u$ and $v$ have the same parity. Therefore
$$
\alpha=\frac{u-v}{2}+v\beta\in\mathbb{Z}+\mathbb{Z}\beta.
$$

Conversely, an element $(u+v\sqrt5)/2$ with integers $u,v$ of the same parity
satisfies the monic integer polynomial
$$
T^2-uT+\frac{u^2-5v^2}{4}.
$$
This proves the asserted equality. The trace-and-norm criterion and its general
quadratic form are discussed in Brian Conrad,
[Quadratic integer rings, Theorem 1.1](https://math.stanford.edu/~conrad/210BPage/handouts/quadint.pdf).

## The two lattices

The field discriminant uses a $\mathbb{Z}$-basis of $\mathcal O_K$.
Two such bases differ by an integer matrix of determinant $\pm1$, which
preserves the trace determinant.

Here
$$
(1,\sqrt5)=(1,\beta)P,\qquad
P=\begin{pmatrix}1&-1\\0&2\end{pmatrix}.
$$
The trace matrix changes from $G$ to $P^{\mathsf T}GP$, so
$$
20=(\det P)^2\cdot5=2^2\cdot5.
$$
Thus the field discriminant is $5$; the determinant $20$ belongs to the
index-$2$ sublattice $\mathbb{Z}+\mathbb{Z}\sqrt5$.

[Return to the calculations](README.md#which-discriminant-belongs-to-the-field).
