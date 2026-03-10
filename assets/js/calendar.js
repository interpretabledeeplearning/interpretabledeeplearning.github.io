var SESSION_TBD = "TBD";
var YOUTUBE_LIVE_URL = "https://www.youtube.com/@InterpretableDeepLearning/live";

function formatSessionDateTime(startDate, endDate) {
  if (!startDate || Number.isNaN(startDate.getTime())) {
    return SESSION_TBD;
  }

  var dateOptions = { year: "numeric", month: "long", day: "numeric" };
  var timeOptions = { hour: "numeric", minute: "2-digit", timeZoneName: "short" };
  var startDateText = startDate.toLocaleDateString(undefined, dateOptions);
  var startTimeText = startDate.toLocaleTimeString(undefined, timeOptions);

  if (!endDate || Number.isNaN(endDate.getTime())) {
    return startDateText + " at " + startTimeText;
  }

  var endDateText = endDate.toLocaleDateString(undefined, dateOptions);
  var endTimeText = endDate.toLocaleTimeString(undefined, timeOptions);
  if (startDate.toDateString() === endDate.toDateString()) {
    return startDateText + " from " + startTimeText + " to " + endTimeText;
  }

  return startDateText + " " + startTimeText + " to " + endDateText + " " + endTimeText;
}

function getTextOrTbd(value) {
  if (typeof value !== "string") {
    return SESSION_TBD;
  }
  var trimmed = value.trim();
  return trimmed ? trimmed : SESSION_TBD;
}

function setText(id, value) {
  var node = document.getElementById(id);
  if (node) {
    node.textContent = value;
  }
}

function setPaperLink(paperUrl) {
  var paperNode = document.getElementById("paper-link");
  if (!paperNode) {
    return;
  }

  if (typeof paperUrl === "string" && /^https?:\/\//i.test(paperUrl.trim())) {
    paperNode.href = paperUrl.trim();
    paperNode.target = "_blank";
    paperNode.rel = "noopener noreferrer";
    paperNode.classList.remove("disabled");
    paperNode.removeAttribute("aria-disabled");
    paperNode.removeAttribute("tabindex");
    return;
  }

  paperNode.href = "#";
  paperNode.removeAttribute("target");
  paperNode.removeAttribute("rel");
  paperNode.classList.add("disabled");
  paperNode.setAttribute("aria-disabled", "true");
  paperNode.setAttribute("tabindex", "-1");
}

function setSessionDate(startDate, endDate, location) {
  var dateNode = document.getElementById("session-date");
  if (!dateNode) {
    return;
  }

  if (startDate && !Number.isNaN(startDate.getTime())) {
    dateNode.dataset.startDate = startDate.toISOString();
    if (endDate && !Number.isNaN(endDate.getTime())) {
      dateNode.dataset.endDate = endDate.toISOString();
    } else {
      delete dateNode.dataset.endDate;
    }
    dateNode.dataset.location = location || "Online";
    dateNode.innerHTML = formatSessionDateTime(startDate, endDate);
    return;
  }

  delete dateNode.dataset.startDate;
  delete dateNode.dataset.endDate;
  delete dateNode.dataset.location;
  dateNode.innerHTML = SESSION_TBD;
}

function setNoSessionsState(visible) {
  var noSessionsEl = document.getElementById("no-sessions-message");
  var sessionDetailsEl = document.getElementById("session-details");
  if (noSessionsEl) {
    noSessionsEl.style.display = visible ? "" : "none";
  }
  if (sessionDetailsEl) {
    sessionDetailsEl.style.display = visible ? "none" : "";
  }
}

function applyNextSessionData(nextSession) {
  if (!nextSession) {
    setNoSessionsState(true);
    return;
  }
  setNoSessionsState(false);

  var title = getTextOrTbd(nextSession.title);
  var speaker = getTextOrTbd(nextSession.speaker);
  var abstract = getTextOrTbd(nextSession.abstract || nextSession.description);

  setText("session-title", title);
  setText("session-speaker", speaker);
  setText("session-abstract", abstract);

  var startDate = nextSession.start ? new Date(nextSession.start) : null;
  var endDate = nextSession.end ? new Date(nextSession.end) : null;
  setSessionDate(startDate, endDate, nextSession.location);

  var meetingNode = document.getElementById("meeting-link");
  if (meetingNode) {
    meetingNode.href = YOUTUBE_LIVE_URL;
  }

  setPaperLink(nextSession.paper_url);
}

function pickSessionFromUpcoming(upcomingSessions) {
  if (!Array.isArray(upcomingSessions)) {
    return null;
  }
  var now = new Date();
  for (var i = 0; i < upcomingSessions.length; i++) {
    var session = upcomingSessions[i];
    var endTime = session.end ? new Date(session.end) : null;
    var startTime = session.start ? new Date(session.start) : null;
    var effectiveEnd = endTime && !isNaN(endTime.getTime()) ? endTime : startTime;
    if (effectiveEnd && effectiveEnd.getTime() >= now.getTime()) {
      return session;
    }
  }
  return null;
}

function loadNextSession() {
  var sessionCard = document.getElementById("next-session-card");
  if (!sessionCard || !window.fetch) {
    return;
  }

  var dataUrl = sessionCard.dataset && sessionCard.dataset.nextSessionUrl;
  if (!dataUrl) {
    applyNextSessionData(null);
    return;
  }

  fetch(dataUrl, { cache: "no-store" })
    .then(function (response) {
      if (!response.ok) {
        throw new Error("HTTP " + response.status);
      }
      return response.json();
    })
    .then(function (payload) {
      var session = null;
      if (payload && Array.isArray(payload.upcoming_sessions) && payload.upcoming_sessions.length > 0) {
        session = pickSessionFromUpcoming(payload.upcoming_sessions);
      } else if (payload && payload.next_session) {
        session = payload.next_session;
      }
      applyNextSessionData(session);
    })
    .catch(function () {
      applyNextSessionData(null);
    });
}

function generateICS(eventData) {
  var title = (eventData && eventData.title) || "Interpretable Deep Learning Reading Group";
  var description = (eventData && eventData.description) || "";
  var location = (eventData && eventData.location) || "";
  var startDate = (eventData && eventData.startDate) || null;
  var endDate = (eventData && eventData.endDate) || null;
  var url = (eventData && eventData.url) || "";

  if (!startDate) {
    alert("Event date is not yet announced. Please check back later!");
    return;
  }

  function formatDate(date) {
    return date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
  }

  var startDateObj = new Date(startDate);
  if (Number.isNaN(startDateObj.getTime())) {
    alert("Event date format is invalid. Please check back later!");
    return;
  }

  var endDateObj = endDate ? new Date(endDate) : new Date(startDateObj.getTime() + 60 * 60 * 1000);
  var start = formatDate(startDateObj);
  var end = formatDate(endDateObj);

  var icsContent = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Interpretable Deep Learning//Reading Group//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    "DTSTART:" + start,
    "DTEND:" + end,
    "SUMMARY:" + title,
    "DESCRIPTION:" + description.replace(/\n/g, "\\n"),
    "LOCATION:" + location,
    "URL:" + url,
    "STATUS:CONFIRMED",
    "SEQUENCE:0",
    "CREATED:" + formatDate(new Date()),
    "LAST-MODIFIED:" + formatDate(new Date()),
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");

  var blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
  var link = document.createElement("a");
  link.href = window.URL.createObjectURL(blob);
  link.download = "reading-group-session.ics";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function addReadingGroupToCalendar() {
  var titleNode = document.getElementById("session-title");
  var abstractNode = document.getElementById("session-abstract");
  var dateNode = document.getElementById("session-date");
  var meetingNode = document.getElementById("meeting-link");

  var eventData = {
    title: (titleNode && titleNode.textContent) || "Interpretable Deep Learning Reading Group",
    description: (abstractNode && abstractNode.textContent) || "",
    location: (dateNode && dateNode.dataset && dateNode.dataset.location) || "Online (Zoom)",
    startDate: (dateNode && dateNode.dataset && dateNode.dataset.startDate) || null,
    endDate: (dateNode && dateNode.dataset && dateNode.dataset.endDate) || null,
    url: (meetingNode && meetingNode.href) || "",
  };

  generateICS(eventData);
}

document.addEventListener("DOMContentLoaded", loadNextSession);
