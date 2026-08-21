---
layout: distill
title: Graphical Design of Interpretable Architectures
description: >
  Designing, implementing, and comparing interpretable architectures requires a formal language to represent them. The most common representations fall short in one of two ways. Symbolic equations give no global view of an architecture at a glance. Probabilistic graphical models and flowcharts do not describe actual tensor manipulations, thus hiding key insights and limiting reproducibility.
  To close this gap, we introduce a graphical notation for designing interpretable AI architectures, adapted from Penrose tensor notation. This graphical notation gives a global view of an architecture and maps one to one onto PyTorch einsum code. We first use this notation to describe architectures that are interpretable by construction, including concept bottlenecks, sparse probes, prototype networks, neural additive models, and mixtures of linear models. We then diagram the key architectural components of Steerling-8B, a frontier interpretable language model. The diagram yields global insights into the architecture (e.g., showing that Steerling is a residual model), a geometric interpretation of each individual operation, and a direct translation into 33 lines of PyTorch code.
date: 2026-08-20
featured: false

authors:
  - name: Pietro Barbiero
    affiliations:
      name: IBM Research, Zurich

bibliography: posts/2026-08-20-graphical-design-interpretable-architectures.bib

toc:
  - name: Introduction
  - name: Graphical Einstein-inspired notation in PyTorch
    subsections:
      - name: Tensors
      - name: Operations
  - name: Graphical design of simple neural models
  - name: Graphical design of interpretable architectures
    subsections:
      - name: Concept encoding maps
      - name: Concept composition maps
  - name: "Case study: frontier interpretable language models"
  - name: Discussion
    subsections:
      - name: Related works
      - name: Limitations and concrete usage
      - name: Conclusion

tags: [interpretability, concepts, tensor-notation]
categories: [research]
---

## Introduction

Frontier AI models manipulate high-dimensional objects called tensors. For this reason, to understand, design, or implement these models, we must think in high-dimensional terms. As frontier models are composed of many such operations, intuitive and formal representations of their tensor manipulations are key to understanding, comparing, and designing state-of-the-art architectures.

Common formal representations, such as symbolic equations, may limit global insights on the architecture at a glance. As an example, the expression

$$
f(x_k,w_{kri},t_{krij}) = \sum_i \sigma(x_{k}w_{kri}) t_{krij}
$$

hides that the tensor manipulations act on individual features \\(k\\) of \\(x\\) independently. We must carefully work through the whole expression to see this. This process requires time, effort, and it is intrinsically prone to errors. Graphical notations, such as probabilistic graphical models and flowcharts, are commonly used specifically to compensate the shortcomings of symbolic representations and convey immediate insights:

{% include figure.liquid path="assets/img/posts/2026-08-20-graphical-design-interpretable-architectures/Alternatives.png" class="img-fluid" %}

However, while these diagrams provide a high-level overview of the architecture, they do not specify how the architecture should be concretely implemented thus obfuscating important innovations and limiting reproducibility.

To solve this, we introduce a graphical notation, adapted from Penrose tensor notation, for designing interpretable AI architectures that enables global insights and maps one to one onto PyTorch `einsum` code. While prior work has used a similar notation to analyse language models and mechanistic interpretability, we use this notation to describe architectures that are interpretable by construction, including concept bottlenecks, sparse probes, prototype networks, neural additive models, and mixtures of linear models. As a case study, we diagram the full architecture of Steerling-8B, showing the advantages of such notation in practice.

## Graphical Einstein-inspired notation in PyTorch

A well-known graphical notation for tensor operations, originating in physics, is Penrose or tensor-network notation <d-cite key="penrose1971applications"></d-cite>. Recent work has adapted it to analyse language models and mechanistic interpretability <d-cite key="taylor2024introduction,elhage2021mathematical"></d-cite>. To our knowledge, no prior work has used it to analyse models that are interpretable by construction.

We first introduce the fragment of Penrose notation we need. We then use it to analyse the key operations behind frontier interpretable AI models.

### Tensors

In this work, a tensor of order \\(k\\) is an array with \\(k\\) indices, \\(T \in \mathbb{R}^{n_1 \times \dots \times n_k}, n_i,k\in \mathbb{N}\\). A scalar has order \\(0\\), a vector order \\(1\\), a matrix order \\(2\\), and so on. The table below lists common tensors, how to generate each at random in PyTorch, and its geometric meaning. In our diagrams, a tensor is a circle with "legs". Each leg stands for one geometric dimension, that is, one array index.

<div class="table-responsive">
<table class="table">
<thead>
<tr><th>Name / op</th><th>Diagram</th><th>Array shape</th><th>Algebraic</th></tr>
</thead>
<tbody>
<tr>
<td>Scalar<br><code>s = torch.randn(1)</code></td>
<td>{% include figure.liquid path="assets/img/posts/2026-08-20-graphical-design-interpretable-architectures/Scalar.png" class="img-fluid" %}</td>
<td>\(\left[\begin{smallmatrix}\cdot\end{smallmatrix}\right]\)</td>
<td>\(s \in \mathbb{R}\)</td>
</tr>
<tr>
<td>Vector<br><code>v = torch.randn(n)</code></td>
<td>{% include figure.liquid path="assets/img/posts/2026-08-20-graphical-design-interpretable-architectures/Vector.png" class="img-fluid" %}</td>
<td>\(\left[\begin{smallmatrix}\cdot\\\cdot\\\cdot\end{smallmatrix}\right]\)</td>
<td>\(v \in \mathbb{R}^n\)</td>
</tr>
<tr>
<td>Matrix<br><code>A = torch.randn(m, n)</code></td>
<td>{% include figure.liquid path="assets/img/posts/2026-08-20-graphical-design-interpretable-architectures/Matrix.png" class="img-fluid" %}</td>
<td>\(\left[\begin{smallmatrix}\cdot&\cdot\\\cdot&\cdot\\\cdot&\cdot\end{smallmatrix}\right]\)</td>
<td>\(A \in \mathbb{R}^{m \times n}\)</td>
</tr>
<tr>
<td>3-Tensor<br><code>T = torch.randn(a, b, c)</code></td>
<td>{% include figure.liquid path="assets/img/posts/2026-08-20-graphical-design-interpretable-architectures/Tensor.png" class="img-fluid" %}</td>
<td>&mdash;</td>
<td>\(T \in \mathbb{R}^{a \times b \times c}\)</td>
</tr>
</tbody>
</table>
</div>

### Operations

AI models manipulate tensors using tensor operations. Tensor operations admit a formal notation known as *Einstein-inspired notation for operations* <d-cite key="einstein1916grundlage"></d-cite> or "Einops" <d-cite key="rogozhnikov2022einops"></d-cite>. PyTorch supports two main Einops: `rearrange`, which reorders tensor's axes, and `einsum`, which combines multiple tensors. Given their expressivity, mastering Einops, and `einsum` above all, is one of the most useful skills for designing and implementing AI architectures.

Unfortunately, PyTorch `einsum` is hard to parse at a glance. It is not the best tool for designing, comparing, or reasoning about tensor operations. It does, however, map one to one onto Penrose graphical notation. This visual notation makes complex tensor operations clear, formal, and unambiguous.

The convention works as follows <d-cite key="einstein1916grundlage,penrose1971applications"></d-cite>. To combine two tensors, we connect legs that share a label; a shared label marks the same geometric dimension/index. A connected pair of legs is contracted: we multiply the two tensors' entries together for each value of that shared index, then sum over the index. This leaves "cancels" the leg out. Any legs left unconnected are "free" legs, and they become the indices of the result.

We can turn each diagram directly into PyTorch code with `einsum`, using the convention `einsum('legs_of_input_tensor_A,legs_of_input_tensor_B->legs_of_output_tensor', A, B)`. This lets us design a tensor operation as a diagram, get the diagram's clarity, and then convert it straight into working PyTorch code.

The table below lists the most common tensor operations. These form the building blocks of the tensor manipulations used in frontier interpretable models.

<div class="table-responsive">
<table class="table">
<thead>
<tr><th>Name / op</th><th>Diagram</th><th>Algebraic</th></tr>
</thead>
<tbody>
<tr>
<td>Scalar multiplication<br><code>h = torch.einsum(',->', v, w)</code></td>
<td>{% include figure.liquid path="assets/img/posts/2026-08-20-graphical-design-interpretable-architectures/Scalar_multiplication.png" class="img-fluid" %}</td>
<td>\(h = a b\)</td>
</tr>
<tr>
<td>Element-wise product<br><code>h = einsum('i,i->i', a, b)</code></td>
<td>{% include figure.liquid path="assets/img/posts/2026-08-20-graphical-design-interpretable-architectures/Elementwise_product.png" class="img-fluid" %}</td>
<td>\(h_i = a_i b_i\)</td>
</tr>
<tr>
<td>Dot product<br><code>h = einsum('i,i->', a, b)</code></td>
<td>{% include figure.liquid path="assets/img/posts/2026-08-20-graphical-design-interpretable-architectures/Dot.png" class="img-fluid" %}</td>
<td>\(h = \sum_i a_i b_i\)</td>
</tr>
<tr>
<td>Squared norm<br><code>h = einsum('i,i->', a, a)</code></td>
<td>{% include figure.liquid path="assets/img/posts/2026-08-20-graphical-design-interpretable-architectures/Norm2.png" class="img-fluid" %}</td>
<td>\(h = \sum_i a_i a_i = \|a\|_2\)</td>
</tr>
<tr>
<td>Normalize<br><code>asqn = einsum('i,i->', a, a)</code><br><code>an = a / asqn**0.5</code></td>
<td>{% include figure.liquid path="assets/img/posts/2026-08-20-graphical-design-interpretable-architectures/Normalisation.png" class="img-fluid" %}</td>
<td>\(\hat a_i = a_i \big/ \sqrt{\sum_j a_j^2}\)</td>
</tr>
<tr>
<td>Convex combination<br><code>h = einsum('i,i->', a, bn)</code></td>
<td>{% include figure.liquid path="assets/img/posts/2026-08-20-graphical-design-interpretable-architectures/Convex_combination.png" class="img-fluid" %}</td>
<td>\(h = \sum_i a_i \hat b_i\)</td>
</tr>
<tr>
<td>Cosine similarity<br><code>h = einsum('i,i->', an, bn)</code></td>
<td>{% include figure.liquid path="assets/img/posts/2026-08-20-graphical-design-interpretable-architectures/Cosine_similarity.png" class="img-fluid" %}</td>
<td>\(h = \sum_i \hat a_i \hat b_i\)</td>
</tr>
<tr>
<td>Sum of matrix slices<br><code>h = einsum('ik->i', A)</code></td>
<td>{% include figure.liquid path="assets/img/posts/2026-08-20-graphical-design-interpretable-architectures/Matrix_slice_sum.png" class="img-fluid" %}</td>
<td>\(h_i = \sum_k A_{ik}\)</td>
</tr>
<tr>
<td>Matrix-vector product<br><code>h = einsum('ij,i->j', A, b)</code></td>
<td>{% include figure.liquid path="assets/img/posts/2026-08-20-graphical-design-interpretable-architectures/Matrix_vector.png" class="img-fluid" %}</td>
<td>\(h_j = \sum_i A_{ij}b_i\)</td>
</tr>
<tr>
<td>Scaled matrix slices<br><code>h = einsum('ij,i->ij', A, b)</code></td>
<td>{% include figure.liquid path="assets/img/posts/2026-08-20-graphical-design-interpretable-architectures/Convex_combination_matrix.png" class="img-fluid" %}</td>
<td>\(H_{ij} = A_{ij} b_i\)</td>
</tr>
<tr>
<td>Matrix-matrix product<br><code>H = einsum('ij,ik->jk', A, B)</code></td>
<td>{% include figure.liquid path="assets/img/posts/2026-08-20-graphical-design-interpretable-architectures/Matrix_matrix.png" class="img-fluid" %}</td>
<td>\(H_{jk} = \sum_i A_{ij}B_{ik}\)</td>
</tr>
</tbody>
</table>
</div>

## Graphical design of simple neural models

With linear algebra fresh in mind, we can now use the graphical notation to design AI models. As introductory examples, we design two familiar models, a linear model <d-cite key="berkson1944application,cox1958regression"></d-cite> and a multi-layer perceptron <d-cite key="rumelhart1986learning"></d-cite>, before moving to more advanced cases, such as self-attention <d-cite key="vaswani2017attention"></d-cite>.

A linear model <d-cite key="berkson1944application,cox1958regression"></d-cite> is one of the oldest models in statistics, yet it remains an important baseline for interpretable machine learning, and it forms the backbone of more complex operations in frontier models. A linear model is a matrix-vector product followed by an activation function. The vector \\(x \in \mathbb{R}^d\\) holds the features of an input sample, and the matrix \\(W \in \mathbb{R}^{h \times d}\\) holds the model's learnable parameters. Since this model usually has a non-linear activation which makes the diagram asymmetric, we extend Penrose diagrams drawing the input node in gray and performing tensor operations from left to right (or top-down):

{% include figure.liquid path="assets/img/posts/2026-08-20-graphical-design-interpretable-architectures/Linear.png" class="img-fluid" %}

<div class="table-responsive">
<table class="table">
<thead>
<tr><th>Code</th><th>Algebraic</th></tr>
</thead>
<tbody>
<tr>
<td><code>y = sigma(einsum('j,ij->i', x, W))</code></td>
<td>\(y_i = \sigma \left(\sum_j W_{ij}x_j \right)\)</td>
</tr>
</tbody>
</table>
</div>

We can apply a linear model to many inputs at once by stacking samples \\(x_j\\) into a batch tensor \\(X \in \mathbb{R}^{b \times d}\\). We can also stack several linear models on top of each other. This gives a multi-layer perceptron (MLP) <d-cite key="rumelhart1986learning"></d-cite>:

{% include figure.liquid path="assets/img/posts/2026-08-20-graphical-design-interpretable-architectures/MLP.png" class="img-fluid" %}

<div class="table-responsive">
<table class="table">
<thead>
<tr><th>Code</th><th>Algebraic</th></tr>
</thead>
<tbody>
<tr>
<td>
<code>z1 = sigma(einsum('bj,ij->bi', X, W0))</code><br>
<code>z2 = sigma(einsum('bj,ij->bi', z1, W1))</code><br>
&hellip;<br>
<code>y = sigma(einsum('bj,ij->bi', zL, WL))</code>
</td>
<td>
$$
Y_{bi_L} = \sigma \left( \sum_{i_{L-1}} W_{i_L, i_{L-1}}^{(L)} \dots \sigma \left( \sum_{j_0} W_{i_0, j_0}^{(0)} X_{bj_0} \right) \right)
$$
</td>
</tr>
</tbody>
</table>
</div>

Self-attention <d-cite key="vaswani2017attention"></d-cite> is a key, more complex operation in frontier AI models. This operation projects an input sequence \\(Z\\) of \\(t\\) tokens into a query \\(q\\), key \\(k\\), and value \\(v\\) embeddings. For each pair of tokens \\((t,t_p)\\), self-attention scores how relevant token \\(t_p\\) is to token \\(t\\). It then uses these relevance scores as weights to combine the value vectors.

Since the tensor manipulations are a bit more complex, we break down the self-attention mechanism into simple atomic manipulations. The first step is to "copy" the input \\(Z\\) since we need to reuse this tensor multiple times. In our notation, copying a tensor can be expressed by branching all its legs. We use the index \\(t_p\\) for the legs of the second and third copy of \\(Z\\) as these legs will be used to index key and value tokens the query can attend to:

{% include figure.liquid path="assets/img/posts/2026-08-20-graphical-design-interpretable-architectures/Step1.png" class="img-fluid" %}

Each copy of the tensor \\(Z\\) gets multiplied by a matrix \\(W \in \mathbb{R}^{d \times e}\\) to produce key, query, and value tensors \\(k,q,v \in \mathbb{R}^{t \times e}\\):

{% include figure.liquid path="assets/img/posts/2026-08-20-graphical-design-interpretable-architectures/Step2.png" class="img-fluid" %}

For each pair of tokens \\((t,t_p)\\), we compute how much the query token \\(t\\) attends to the key token \\(t_p\\):

{% include figure.liquid path="assets/img/posts/2026-08-20-graphical-design-interpretable-architectures/Step3.png" class="img-fluid" %}

We then normalise these "affinity" scores into probability values using a softmax activation:

{% include figure.liquid path="assets/img/posts/2026-08-20-graphical-design-interpretable-architectures/Step4.png" class="img-fluid" %}

And finally we can compute the new embedding of the token \\(t\\) as a convex combination of value embeddings \\(v\\) weighted by their respective probability score:

{% include figure.liquid path="assets/img/posts/2026-08-20-graphical-design-interpretable-architectures/Step5.png" class="img-fluid" %}

In a single diagram we can draw self-attention as follows:

{% include figure.liquid path="assets/img/posts/2026-08-20-graphical-design-interpretable-architectures/Attention.png" class="img-fluid" %}

<div class="table-responsive">
<table class="table">
<thead>
<tr><th>Code</th><th>Algebraic</th></tr>
</thead>
<tbody>
<tr>
<td>
<code>q = einsum('td,de->te', Z, W_q)</code><br>
<code>k = einsum('pd,de->pe', Z, W_k)</code><br>
<code>v = einsum('pd,de->pe', Z, W_v)</code>
</td>
<td>
\(q_{te} = \sum_d Z_{td} W_{q,de}\)<br>
\(k_{pe} = \sum_d Z_{pd} W_{k,de}\)<br>
\(v_{pe} = \sum_d Z_{pd} W_{v,de}\)
</td>
</tr>
<tr>
<td><code>l = einsum('te,pe->tp', q, k) / sqrt(e)</code></td>
<td>\(l_{tp} = \frac{1}{\sqrt{e}} \sum_e q_{te} k_{pe}\)</td>
</tr>
<tr>
<td><code>probs = softmax(l, dim=-1)</code></td>
<td>\(\text{probs}_{tp} = \text{softmax}_p \left( l_{tp} \right)\)</td>
</tr>
<tr>
<td><code>h = einsum('tp,pe->te', probs, v)</code></td>
<td>\(h_{te} = \sum_p \text{probs}_{tp} v_{pe}\)</td>
</tr>
</tbody>
</table>
</div>

From here on, diagrams stay minimal: we draw only the indices involved in a contraction. PyTorch supports this directly through ellipsis notation, which lets a tensor operation generalize to any number of batch dimensions. For example, an operation with three preserved indices, batch \\(b\\), token \\(t\\), and head \\(q\\), written as

```
einsum('btqij,btqjk->btqik', A, B)
```

can be rewritten as

```
einsum('...ij,...jk->...ik', A, B)
```

## Graphical design of interpretable architectures

Interpretable architectures can be generally segmented into three distinct components <d-cite key="koh2020concept,alvarez2018towards,chen2019looks,barbiero2026standard"></d-cite>: a *backbone* that maps input \\(x\\) to a hidden representation \\(z\\), a *concept encoding map* that turns \\(z\\) into human-meaningful concepts \\(c\\), and a *concept composition map* that turns those concepts into a task prediction \\(y\\).

Most interpretable architectures use specific tensor operations in their concept encoding and concept composition maps to meet interpretability constraints <d-cite key="rudin2019stop,barbiero2026standard"></d-cite>. Here we analyse the most common and recurring of these operations, shared across different families of interpretable models.

### Concept encoding maps

Concept encoding maps transform latent representations \\(z\\) into representations \\(c\\), known as concepts, that are constrained to align with human semantics. The most common maps in the literature, in order of increasing tensor-manipulation complexity, are probes such as concept activation vectors (CAVs) <d-cite key="kim2018interpretability"></d-cite> and sparse autoencoders (SAEs) <d-cite key="ranzato2006efficient,huben2024sparse,templeton2026scaling"></d-cite>, concept bottlenecks <d-cite key="koh2020concept,espinosa2022concept"></d-cite>, and prototype-based models <d-cite key="chen2019looks,colamonaco2026prototype"></d-cite>.

**Sparse encoders** <d-cite key="ranzato2006efficient"></d-cite> map latent representations \\(z \in \mathbb{R}^d\\) into the sparse activations \\(c \in \mathbb{R}^k\\) via a sparse linear map \\(W \in \mathbb{R}^{d \times k}\\) with \\(k \gg d\\)

{% include figure.liquid path="assets/img/posts/2026-08-20-graphical-design-interpretable-architectures/Probe.png" class="img-fluid" %}

<div class="table-responsive">
<table class="table">
<thead>
<tr><th>Code</th><th>Algebraic</th></tr>
</thead>
<tbody>
<tr>
<td><code>c = sigma(einsum('d,dk->k', z, W))</code></td>
<td>\(c_k = \sigma \left(\sum_d W_{kd}z_d \right)\)</td>
</tr>
</tbody>
</table>
</div>

**Concept bottlenecks** <d-cite key="koh2020concept"></d-cite> map a latent representation \\(z\\) into the concept representation \\(c\\) via a supervised linear map

{% include figure.liquid path="assets/img/posts/2026-08-20-graphical-design-interpretable-architectures/Bottleneck.png" class="img-fluid" %}

<div class="table-responsive">
<table class="table">
<thead>
<tr><th>Code</th><th>Algebraic</th></tr>
</thead>
<tbody>
<tr>
<td><code>c = sigma(einsum('d,dk->k', z, W))</code></td>
<td>\(c_k = \sigma \left(\sum_d W_{kd}z_d \right)\)</td>
</tr>
</tbody>
</table>
</div>

In both cases the tensor operation is identical. The difference lies in the loss and in what the concepts mean: sparse probes recover concept semantics post-hoc (through additional data and labels), while concept bottlenecks build concept semantics into the loss from the start using ground-truth concept annotations \\(c^{[h]}\\).

**Concept embedding bottlenecks** <d-cite key="espinosa2022concept"></d-cite> map a latent representation \\(z\\) into a high dimensional concept representation \\(u \in \mathbb{R}^{d \times k \times s \times e}\\) where \\(s\\) is the concept cardinality and \\(e\\) the embedding size. This concept representation is then used to compute concept predictions \\(c_k\\):

{% include figure.liquid path="assets/img/posts/2026-08-20-graphical-design-interpretable-architectures/Bottleneck_embeddings.png" class="img-fluid" %}

<div class="table-responsive">
<table class="table">
<thead>
<tr><th>Code</th><th>Algebraic</th></tr>
</thead>
<tbody>
<tr>
<td><code>u = einsum('d,dkse->kse', z, W)</code></td>
<td>\(u_{kse} = \sum_d W_{dske}z_d\)</td>
</tr>
<tr>
<td><code>c = sigma(einsum('kse,e->ks', u, S))</code></td>
<td>\(c_{ks} = \sigma \left( \sum_{e} u_{kse} S_{e} \right)\)</td>
</tr>
</tbody>
</table>
</div>

**Prototype-based concept maps** <d-cite key="chen2019looks,colamonaco2026prototype"></d-cite> need a genuinely different tensor operation. We can think of prototypes as reference examples that tell us whether a concept is active. For instance, the embedding of an apple or a ball can serve as a positive "prototypical example" for the concept round, and a fridge or a book as a negative example. Ground-truth prototype labels sit in the tensor \\(\pi^{[h]} \in \mathbb{R}^{p \times k}\\), so each concept \\(k\\) has \\(p\\) labelled prototypes. For a concept \\(k\\) and an input embedding \\(z \in \mathbb{R}^d\\), we compare \\(z\\) against every prototype in \\(P \in \mathbb{R}^{d \times p \times k}\\) and compute the concept label based on input-prototype similarity. For instance, if \\(z\\) is closer to the prototypes for book and fridge than to the prototypes for apple and ball, then the predicted label for round should sit close to \\(0\\).

{% include figure.liquid path="assets/img/posts/2026-08-20-graphical-design-interpretable-architectures/Prototype_concepts.png" class="img-fluid" %}

<div class="table-responsive">
<table class="table">
<thead>
<tr><th>Code</th><th>Algebraic</th></tr>
</thead>
<tbody>
<tr>
<td><code>l = einsum('d,dpk->pk', zn, Pn)</code></td>
<td>\(\text{l}_{pk} = \sum_d \hat{P}_{dpk}z_d\)</td>
</tr>
<tr>
<td><code>probs = softmax(l, dim=-1)</code></td>
<td>\(\text{probs}_{pk} = \text{sm} \left(l_{pk} \right)\)</td>
</tr>
<tr>
<td><code>c_pred = einsum('pk,pk->k', probs, p_true))</code></td>
<td>\(c_k = \sum_p \text{probs}_{pk}\pi_{pk}^{[h]}\)</td>
</tr>
</tbody>
</table>
</div>

### Concept composition maps

In most interpretability works, the concept composition map is a simple linear model: self-explaining neural nets <d-cite key="alvarez2018towards"></d-cite>, sparse autoencoders <d-cite key="huben2024sparse,templeton2026scaling"></d-cite>, concept bottleneck models <d-cite key="koh2020concept"></d-cite>, all use linear models. A few exceptions are worth discussing: neural additive models <d-cite key="agarwal2021neural"></d-cite>, concept embedding predictors <d-cite key="espinosa2022concept"></d-cite>, and mixtures of linear models <d-cite key="alvarez2018towards,barbiero2023interpretable,debot2024interpretable,desantis2026mixtureconceptbottleneckexperts"></d-cite>.

**Neural additive models** <d-cite key="agarwal2021neural"></d-cite> transform concept activations \\(c\\) independently using a different MLP for each concept \\(k\\) and output task \\(r\\). Then, for each task, they sum the outputs of the MLP of each concept to predict target \\(y_r\\):

{% include figure.liquid path="assets/img/posts/2026-08-20-graphical-design-interpretable-architectures/NAM.png" class="img-fluid" %}

<div class="table-responsive">
<table class="table">
<thead>
<tr><th>Code</th><th>Algebraic</th></tr>
</thead>
<tbody>
<tr>
<td><code>h1 = sigma(einsum('k,kri->kri', c, W1))</code></td>
<td>\(h_{kri}^{(1)} = \sigma \left( c_k W^{(1)}_{kri} \right)\)</td>
</tr>
<tr>
<td><code>h2 = sigma(einsum('kri,krij->krj', h1, W2))</code></td>
<td>\(h_{krj}^{(2)} = \sigma \left( \sum_i h_{kri}^{(1)} W^{(2)}_{krij} \right)\)</td>
</tr>
<tr>
<td>&hellip;</td>
<td>&hellip;</td>
</tr>
<tr>
<td><code>hL = einsum('kre,kre->kr', he, WL)</code></td>
<td>\(h_{kr}^{(L)} = \sum_e h_{kre}^{(L-1)} W^{(L)}_{kre}\)</td>
</tr>
<tr>
<td><code>y = sigma(einsum('kr->r', hL))</code></td>
<td>\(y_r = \sigma \left(\sum_k h_{kr}^{(L)}\right)\)</td>
</tr>
</tbody>
</table>
</div>

**Concept embedding predictors** <d-cite key="espinosa2022concept"></d-cite> rescale concept embeddings \\(u\\) (e.g., generated by a concept embedding bottleneck) using concept activations \\(c\\) before projecting into the output space \\(r\\):

{% include figure.liquid path="assets/img/posts/2026-08-20-graphical-design-interpretable-architectures/Predictor_embeddings.png" class="img-fluid" %}

<div class="table-responsive">
<table class="table">
<thead>
<tr><th>Code</th><th>Algebraic</th></tr>
</thead>
<tbody>
<tr>
<td><code>h = einsum('kse,ks->kse', u, c)</code></td>
<td>\(h_{kse} = u_{kse} c_{ks}\)</td>
</tr>
<tr>
<td><code>h = einsum('kse->ke', h)</code></td>
<td>\(h_{ke} = \sum_s h_{kse}\)</td>
</tr>
<tr>
<td><code>l = einsum('ke,ker->r', h, W)</code></td>
<td>\(l_r = \sum_{ke} h_{ke} W_{ker}\)</td>
</tr>
<tr>
<td><code>l = sigma(l)</code></td>
<td>\(y_r = \sigma \left(l_r \right)\)</td>
</tr>
</tbody>
</table>
</div>

**Mixtures of linear models** <d-cite key="desantis2026mixtureconceptbottleneckexperts"></d-cite> compute different predictions for the target \\(y_r\\) using \\(m\\) different linear models. Then each prediction is weighted by the probability of selecting a specific linear model:

{% include figure.liquid path="assets/img/posts/2026-08-20-graphical-design-interpretable-architectures/Mixture_of_linear_models.png" class="img-fluid" %}

<div class="table-responsive">
<table class="table">
<thead>
<tr><th>Code</th><th>Algebraic</th></tr>
</thead>
<tbody>
<tr>
<td><code>l = einsum('d,dm->m', z, W))</code></td>
<td>\(l_m = \sum_d W_{dm} z_d\)</td>
</tr>
<tr>
<td><code>pr = softmax(l, dim=-1)</code></td>
<td>\(\text{pr}_m = \text{sm} \left( l_m \right)\)</td>
</tr>
<tr>
<td><code>v = einsum('k,kmr->mr', c, E)</code></td>
<td>\(v_{mr} = \sum_k E_{kmr} c_k\)</td>
</tr>
<tr>
<td><code>ly = einsum('m,mr->r', pr, v)</code></td>
<td>\(l_r = \sum_{m} v_{mr} \text{pr}_m\)</td>
</tr>
<tr>
<td><code>y = sigma(ly)</code></td>
<td>\(y_r = \sigma \left(l_r \right)\)</td>
</tr>
</tbody>
</table>
</div>

## Case study: frontier interpretable language models

As a case study, we diagram the architecture of Steerling-8B <d-cite key="team2026scaling"></d-cite>, the largest interpretable-by-design language model publicly available at the time of writing.

To keep the focus on the essential tensor manipulations, we drop batch dimensions, since they aren't involved in any contraction, and we show a single attention head; extending to multiple heads is straightforward.
Under these conditions, the essential tensor manipulations in the Steerling-8B architecture take about 30 lines of code.
Drawing the Steerling-8B tensor diagram has three main benefits over the notation used in the original technical report <d-cite key="team2026scaling"></d-cite>:

- It shows at a glance that Steerling-8B is a residual model: the gradient can flow from the output straight back to the first input.
- It maps one to one onto PyTorch einops and activation functions, which makes the diagram useful for reproducing the model faithfully.
- Every operation in the diagram has a direct geometric reading in linear algebra. This lets us read each manipulation as a transformation in space, which helps build intuition for the underlying computation.

{% include figure.liquid path="assets/img/posts/2026-08-20-graphical-design-interpretable-architectures/Steerling.png" class="img-fluid" %}

```python
ht = einsum('tr,re->te', X, E)
hp = einsum('ti,ie->te', X, Ep)

Z = ht + hp

q = einsum('te,ed->td', Z, W_q)
k = einsum('pe,ed->pd', Z, W_k)
v = einsum('pe,ed->pd', Z, W_v)

l = einsum('te,pe->tp', q, k)
l = l / sqrt(W_k.shape[1])

l = l + M

probs = softmax(l, dim=-1)

h = einsum('tp,pe->te', probs, v)

h = einsum('te,ed->td', h, W)
h = dropout(h)

Z = Z + h

h = layernorm(Z)

h = einsum('te,ed->td', h, W1)

h = sigma(h)

h = einsum('te,ed->td', h, W2)

h = dropout(h)

Z = Z + h

ls = einsum('te,ek->tk', Z, Ws)
lu = einsum('te,eu->tu', Z.detach(), Wu)

cs = sigmoid(ls)
cu = sigmoid(lu)

csf = topk(cs)
cuf = topk(cu)

csfe = einsum('tk,ke->te', csf, Ks)
cufe = einsum('tu,ue->te', cuf, Ku)

ce = csfe + cufe

Z = Z - ce

Z = Z + ce

l = einsum('te,er->tr', Z, Wh)

y = sigma(l)
```

## Discussion

### Related works

Graphical tensor notation dates to Penrose <d-cite key="penrose1971applications"></d-cite>, who introduced diagrams for tensor contraction in physics. The notation has since been adopted by the categorical-quantum-mechanics community <d-cite key="coecke2018picturing"></d-cite>, and, more recently, by theoretical computer science and machine learning.

A first line of work has proposed general-purpose diagrammatic languages for deep learning architectures, without a focus on interpretability. Chiang et al. <d-cite key="chiang2021named"></d-cite> propose named-axis tensor notation to disambiguate operations such as attention. Abbott <d-cite key="abbott2024neural"></d-cite> introduces neural circuit diagrams, a graphical language with a formal correspondence to implementation, later used to derive memory-efficient attention algorithms <d-cite key="abbott2025flashattentionnapkindiagrammaticapproach"></d-cite>. Cruttwell et al. <d-cite key="cruttwell2022categorical,lorenz2023causal,gavranovic2024position"></d-cite> pursue a category-theoretic account of architectures more broadly, using string diagrams, a mathematical generalization of Penrose notation, to unify architectures such as convolutional neural nets, recurrent neural nets, and transformers under one algebraic framework.

A more recent line of work started analysing the interpretability literature using graphical notations. Giannini et al. <d-cite key="giannini2024categorical"></d-cite>, Tull et al. <d-cite key="tull2024compositionalinterpretabilityxai"></d-cite>, and Barbiero et al. <d-cite key="barbiero2025foundations"></d-cite> use string diagrams to analyse explainable AI methods and interpretable architectures, but without using the tensor manipulation semantics that maps directly to PyTorch programming interfaces. Taylor <d-cite key="taylor2024introduction"></d-cite> applies Penrose notation to mechanistic interpretability, using it to reverse-engineer trained transformer components such as induction heads, building on the informal flowcharts used by Elhage et al. <d-cite key="elhage2021mathematical"></d-cite> to describe transformer circuits. However, this line of work analyses pre-trained opaque models and does not consider tensor manipulations required by inherently interpretable models.

This paper takes a notation developed for post-hoc analysis of trained models and, for the first time to our knowledge, applies this notation to the forward problem: analysing and designing architectures that are interpretable by construction, with a direct, mechanical path from diagram to PyTorch code.

### Limitations and concrete usage

Tensor diagrams are exact for multilinear operations, but nonlinearities, masking, and discrete operations such as top-k require ad hoc extensions. Closeness to implementation is also a double-edged sword: diagram size grows with the complexity of the tensor manipulations, so full frontier architectures quickly become unwieldy to draw in conference papers. For this reason, we see tensor diagrams as best paired with a coarser formalism such as probabilistic graphical models. Probabilistic graphical models may be used to capture the high-level causal structure between random variables, while small tensor diagrams specify how each conditional probability function is implemented.

### Conclusion

We have shown how tensor diagrams can guide the design of interpretable deep neural networks. For the most common tensor manipulations in interpretability research, we have built a "Rosetta stone" showing the matching diagram, PyTorch code, geometric interpretation, and symbolic equation side by side, so readers from different backgrounds can compare and understand them. We also tackled a harder case: we diagrammed and implemented the key modules of a frontier interpretable-by-design language model, Steerling-8B in about 30 lines of code.

Tensor diagrams are expressive, formal, and map directly onto PyTorch code. For these reasons, they could become a standard tool for designing, comparing, and implementing interpretable architectures, alongside other graphical tools such as probabilistic graphical models.
