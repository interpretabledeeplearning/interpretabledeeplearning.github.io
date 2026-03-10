---
layout: page
permalink: /reading_group_papers/
title: Reading Group Papers
description:
nav: false
---

Papers presented and scheduled for the [Interpretable Deep Learning Reading Group](/reading_group/).

{% assign rg_data = site.data.reading_group_sessions %}
{% assign rg_upcoming = rg_data.upcoming_sessions | where_exp: "s", "s.paper_url != null and s.paper_url != 'TBD' and s.paper_url != ''" %}
{% assign rg_past = rg_data.past_sessions | where_exp: "s", "s.paper_url != null and s.paper_url != 'TBD' and s.paper_url != ''" %}
{% assign rg_next = rg_upcoming | first %}

{% if rg_next %}
#### Next Paper

<div class="publications">
<ol class="bibliography">
<li>
<div class="row">
  <div class="col-sm-2 abbr">
  </div>
  <div class="col-sm-8">
    <div class="title">Title: <em>{{ rg_next.title }}</em></div>
    <div class="author">Presenter: {{ rg_next.speaker }}</div>
    <div class="periodical">Presentation Date: {{ rg_next.start | date: "%B %-d, %Y"}} </div>
    <div class="links">
      <a href="{{ rg_next.paper_url }}" class="btn btn-sm z-depth-0" role="button" rel="external nofollow noopener" target="_blank">Paper</a>
    </div>
  </div>
</div>
</li>
</ol>
</div>
{% endif %}

{% if rg_upcoming.size > 1 %}
#### Upcoming Reading Group Papers

<div class="publications">
<ol class="bibliography">
{% for session in rg_upcoming offset: 1 %}
<li>
<div class="row">
  <div class="col-sm-2 abbr">
  </div>
  <div class="col-sm-8">
    <div class="title">Title: <em>{{ session.title }}</em></div>
    <div class="author">Presenter: {{ session.speaker }}</div>
    <div class="periodical">Presentation Date: {{ session.start | date: "%B %-d, %Y" }}</div>
    <div class="links">
      <a href="{{ session.paper_url }}" class="btn btn-sm z-depth-0" role="button" rel="external nofollow noopener" target="_blank">Paper</a>
    </div>
  </div>
</div>
</li>
{% endfor %}
</ol>
</div>
{% endif %}

{% if rg_past.size > 0 %}
#### Previous Reading Group Papers

<div class="publications">
<ol class="bibliography">
{% for session in rg_past %}
<li>
<div class="row">
  <div class="col-sm-2 abbr">
  </div>
  <div class="col-sm-8">
    <div class="title">Title: <em>{{ session.title }}</em></div>
    <div class="author">Presenter: {{ session.speaker }}</div>
    <div class="periodical">Presentation Date: {{ session.start | date: "%B %-d, %Y" }}</div>
    <div class="links">
      <a href="{{ session.paper_url }}" class="btn btn-sm z-depth-0" role="button" rel="external nofollow noopener" target="_blank">Paper</a>
    </div>
  </div>
</div>
</li>
{% endfor %}
</ol>
</div>
{% endif %}

{% unless rg_next or rg_upcoming.size > 1 or rg_past.size > 0 %}
*No reading group papers are currently listed.*
{% endunless %}
