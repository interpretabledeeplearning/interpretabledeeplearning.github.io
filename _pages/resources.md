---
layout: page
permalink: /resources/
title: Resources
description: Here, we include some useful resources for reasearch in interpretable deep learning.
nav: true
nav_order: 4
---

## Relevant Papers and Materials

Below we include a list of works in the literature, particularly in the
areas of Interpretability/Explainability, that are relevant to our tutorial.
We will discuss several of these papers in our tutorial, however we thought
that it may be benefitial to write them down in list format for people to access
these works more easily. Please keep in mind that this is in **no way an exhaustive list of important works within interpretable deep learning**
as this is a fast moving field and we have only so much space we can use here.
Nevertheless, we still hope you may find this list helpful if you want to get
a sense of where the field is and where it is heading.

#### Concept Learning Surveys
These are some of the surveys that touch on concept representation learning
and its use in interpretable/explainable AI:

<div class="publications">
  {% bibliography -f surveys%}
</div>

#### Various Aspects of XAI
Similarly, there are several key surveys/works that discuss formalisms,
definitons, and limitatons of key ideas in the general field of XAI. These
works touch upon definitions of what it means to explain a model and on some of
the issues of so-called "traditional" XAI approaches (e.g., saliency methods):

<div class="publications">
  {% bibliography -f xai_surveys%}
</div>


#### Supervised Concept Learning
Here we include some relevant works in concept representation learning that
assume concept-labels are provided in some manner to learn concept representations
from which explanations can be then constructed:

<div class="publications">
  {% bibliography -f supervised%}
</div>

#### Unsupervised Concept Learning
In contrast to the works above, the following papers attempt to learn concept
representations without implicit or explicit concept labels. This is done by
the means of concept discovery and represents a particularly active are of reasearch
in this field:

<div class="publications">
  {% bibliography -f unsupervised%}
</div>

#### Reasoning with Concepts
Finally, we include some papers that describe very interesting things one can
do once one has learnt some concept representations (regardless of whether these
representations were learnt with or without concept supervision). These works
are highly related to the field of neuro-symbolic reasoning and we discuss them
in more detail in our presentation:

<div class="publications">
  {% bibliography -f reasoning%}
</div>


----
----

## Concept-Learning Public Codebases

Below we list some concept-based open-sourced libraries. As with our reference
material, this is by no means an exaustive list but rather one that contains
libraries we have had the chance to interact with in the past. If you wish to
include your library here, and it is related to concept-learning, please do
not hesitate to contact us and we will include it here.

{% if site.data.repositories.github_repos %}

<div class="repositories d-flex flex-wrap flex-md-row flex-column justify-content-between align-items-center">
  {% for repo in site.data.repositories.github_repos %}
    {% include repository/repo.liquid repository=repo %}
  {% endfor %}
</div>
{% endif %}
