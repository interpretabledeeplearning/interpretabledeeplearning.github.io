---
layout: page
permalink: /reading_group/
title: Reading Group
description: ""
nav: true
nav_order: 1
---

<script src="{{ '/assets/js/calendar.js' | relative_url }}"></script>

This reading group brings together researchers and practitioners interested in interpretable deep learning.
We discuss recent papers, share insights, and explore methods that make deep learning models more transparent and understandable.
Each session features paper presentations, discussions, and Q&A, with recordings available on our YouTube channel.

<div class="mb-4 text-center">
  <a
    href="https://calendar.google.com/calendar/u/2?cid=aW50ZXJwcmV0YWJsZWRsQGdtYWlsLmNvbQ"
    class="btn btn-outline-secondary btn-lg"
    target="_blank"
    rel="noopener noreferrer"
    >Follow Calendar</a
  >
</div>

<div id="next-session-card" class="card mb-4 session-card" data-next-session-url="{{ '/assets/data/reading-group-next-session.json' | relative_url }}">
  <div class="card-body session-card-body">
    <div id="no-sessions-message" style="display:none;" class="text-center py-4">
      <p class="text-muted mb-0">There are no currently scheduled sessions in the reading group. Check back later!</p>
    </div>
    <div id="session-details">
      <div class="row align-items-center">
        <div class="col-md-8">
          <h3 class="card-title session-title">Next Session</h3>
          <h5 class="mt-4 mb-2">Title</h5>
          <p id="session-title" class="mb-3">TBD</p>
          <h5 class="mt-4 mb-2">Speaker</h5>
          <p class="mb-2" id="session-speaker">TBD</p>
          <h5 class="mt-4 mb-2">Date & Time</h5>
          <p class="mb-2" id="session-date">TBD</p>
          <h5 class="mb-2">Abstract</h5>
          <p id="session-abstract" class="session-abstract">TBD</p>
        </div>
        <div class="col-md-4 text-center">
          <div class="session-actions">
            <div class="session-emoji">🗓️</div>
            <a href="https://www.youtube.com/@InterpretableDeepLearning/live" id="meeting-link" class="btn btn-primary btn-lg mb-3 w-100">Join meeting</a>
            <a href="#" id="paper-link" class="btn btn-outline-secondary btn-lg mb-3 w-100 disabled" aria-disabled="true" tabindex="-1">Link to Paper</a>
            <button onclick="addReadingGroupToCalendar()" class="btn btn-outline-primary btn-lg w-100">Add to calendar</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>

## Future Events

<div class="future-events-calendar mb-4">
  <iframe
    src="https://calendar.google.com/calendar/embed?src=interpretabledl%40gmail.com&ctz=UTC&mode=MONTH&showPrint=0"
    title="Interpretable Deep Learning Reading Group Future Events"
    loading="lazy"
    referrerpolicy="no-referrer-when-downgrade"
  ></iframe>
</div>

## Resources

<div class="row mt-4">
  <div class="col-md-6 mb-4">
    <a href="https://www.youtube.com/@interpretabledeeplearning" class="card-link-reset" target="_blank">
      <div class="card hoverable text-center feature-card feature-card-lg">
        <div class="feature-icon">🎥</div>
        <h4 class="feature-title feature-title-lg">Recorded Sessions</h4>
        <p class="feature-text feature-text-lg">Watch past reading group sessions on our YouTube channel.</p>
      </div>
    </a>
  </div>
  <div class="col-md-6 mb-4">
    <a href="/resources/" class="card-link-reset">
      <div class="card hoverable text-center feature-card feature-card-lg">
        <div class="feature-icon">📚</div>
        <h4 class="feature-title feature-title-lg">Previously Presented Papers</h4>
        <p class="feature-text feature-text-lg">Browse papers discussed in previous sessions.</p>
      </div>
    </a>
  </div>
</div>
