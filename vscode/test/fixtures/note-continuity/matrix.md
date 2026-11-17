# Multiplication and trace

Let $K/\mathbb Q$ be a finite field extension, let $\alpha\in K$, and
put $F=\mathbb Q(\alpha)$. Write $d=[F:\mathbb Q]$, $r=[K:F]$, and

$$
m_\alpha(T)=T^d+\sum_{i=0}^{d-1}c_iT^i
$$

for the minimal polynomial of $\alpha$ over $\mathbb Q$.

## The repeated blocks

Choose an $F$-basis $u_1,\ldots,u_r$ of $K$.
The direct-sum decomposition

$$
K=Fu_1\oplus\cdots\oplus Fu_r
$$

is preserved by multiplication by $\alpha$, since $\alpha\in F$.
On each summand, the ordered $\mathbb Q$-basis

$$
u_j,\alpha u_j,\ldots,\alpha^{d-1}u_j
$$

gives the same matrix as multiplication by $\alpha$ on $F$.
Together these lists form a $\mathbb Q$-basis of $K$.

The relation

$$
\alpha^d=-\sum_{i=0}^{d-1}c_i\alpha^i
$$

shows that this matrix has diagonal entries $0,\ldots,0,-c_{d-1}$.
Its trace is therefore $-c_{d-1}$. Taking the trace of all $r$ blocks gives

$$
\mathrm{Tr}_{K/\mathbb Q}(\alpha)
=-r c_{d-1}.
$$

The block decomposition also gives the characteristic polynomial
$m_\alpha(T)^r$; see the Stacks Project,
[Lemma 9.20.2, stacks-project:0BIG](https://stacks.math.columbia.edu/tag/0BIG).
Brian Conrad gives the same reduction in
[Norm and trace, §2](https://math.stanford.edu/~conrad/210BPage/handouts/normtrace.pdf).

[Return to the example](trace.md#the-degree-factor).
