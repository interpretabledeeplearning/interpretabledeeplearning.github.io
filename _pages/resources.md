---
layout: page
permalink: /resources/
title: Resources
description: Curated resources for research in interpretable deep learning.
nav: true
nav_order: 4
---


## Relevant Papers and Materials

Below we include a list of works in the literature, particularly in the
areas of Interpretability/Explainability, that are relevant to Interpretable Deep Learning.
We discuss several of these works in our [tutorials](/tutorials/), however we thought
that it may be beneficial to write them down in list format for people to access
these works more easily. Please keep in mind that this is in **no way an exhaustive list of important works within interpretable deep learning**
as this is a fast-moving field and we have only so much space we can use here.
Nevertheless, we still hope you may find this list helpful if you want to get
a sense of where the field is and where it is heading.

#### Foundations of Interpretable Machine Learning
We include here some of the works that discuss foundational works in interpretable machine learning using general theoretical frameworks:

<div class="publications">
  {% bibliography -f theory%}
</div>

#### Concept Learning Surveys
These are some of the surveys that touch on concept representation learning
and its use in interpretable/explainable AI:

<div class="publications">
  {% bibliography -f surveys%}
</div>


#### Various Aspects of XAI
Similarly, there are several key surveys/works that discuss formalisms,
definitions, and limitations of key ideas in the general field of XAI. These
works touch upon definitions of what it means to explain a model and on some of
the issues of so-called "traditional" XAI approaches (e.g., saliency methods):

<div class="publications">
  {% bibliography -f xai_surveys%}
</div>


#### Supervised Concept Learning
Here we include some relevant works in concept representation learning that
assume concept labels are provided in some manner to learn concept representations
from which explanations can be then constructed:

<div class="publications">
  {% bibliography -f supervised%}
</div>

#### Unsupervised Concept Learning
In contrast to the works above, the following papers attempt to learn concept
representations without implicit or explicit concept labels. This is done by
means of concept discovery and represents a particularly active area of research
in this field:

<div class="publications">
  {% bibliography -f unsupervised%}
</div>

#### Reasoning with Concepts
Finally, we include some papers that describe very interesting things one can
do once one has learned some concept representations (regardless of whether these
representations were learned with or without concept supervision). These works
are highly related to the field of neuro-symbolic reasoning and we discuss them
in more detail in our presentation:

<div class="publications">
  {% bibliography -f reasoning%}
</div>


----
----

## Interpretable Deep Learning Public Codebases

Below we list some interpretable DL open-source libraries. As with our reference
material, this is by no means an exhaustive list but rather one that contains
libraries we have had the chance to interact with in the past. If you wish to
include your library here, and it is related to interpretable DL, please do
not hesitate to contact us and we will include it here.

{% if site.data.repositories.github_repos %}

<div class="github-repo-grid">
  {% for repo in site.data.repositories.github_repos %}
    <article class="github-repo-card js-repo-card" data-repo="{{ repo }}">
      <div class="github-repo-card__header">
        <a class="github-repo-card__name" href="https://github.com/{{ repo }}" target="_blank" rel="noopener noreferrer">{{ repo }}</a>
      </div>
      <p class="github-repo-card__description">Loading repository details...</p>
      <div class="github-repo-card__meta">
        <span class="github-repo-card__pill">Stars: --</span>
        <span class="github-repo-card__pill">Forks: --</span>
        <span class="github-repo-card__pill">Language: --</span>
      </div>
    </article>
  {% endfor %}
</div>
{% endif %}
