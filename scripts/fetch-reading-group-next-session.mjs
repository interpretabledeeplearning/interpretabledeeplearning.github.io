#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises";
import https from "node:https";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";

export const CALENDAR_ID = "interpretabledl@gmail.com";
export const SHARABLE_CALENDAR_URL =
  "https://calendar.google.com/calendar/u/2?cid=aW50ZXJwcmV0YWJsZWRsQGdtYWlsLmNvbQ";
export const YOUTUBE_LIVE_URL = "https://www.youtube.com/@InterpretableDeepLearning/live";
export const DEFAULT_ICS_URL = `https://calendar.google.com/calendar/ical/${encodeURIComponent(CALENDAR_ID)}/public/basic.ics`;
export const DEFAULT_OUTPUT_PATH = "assets/data/reading-group-next-session.json";
export const DEFAULT_DATA_OUTPUT_PATH = "_data/reading_group_sessions.json";
export const SESSION_TBD = "TBD";

function getErrorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}

export function unfoldIcsLines(icsText) {
  const rawLines = icsText.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
  const lines = [];
  for (const line of rawLines) {
    if ((line.startsWith(" ") || line.startsWith("\t")) && lines.length > 0) {
      lines[lines.length - 1] += line.slice(1);
    } else {
      lines.push(line);
    }
  }
  return lines;
}

export function unescapeIcsText(text) {
  return (text || "")
    .replace(/\\\\/g, "\\")
    .replace(/\\n/gi, "\n")
    .replace(/\\,/g, ",")
    .replace(/\\;/g, ";");
}

export function parseIcsProperty(line) {
  const separatorIndex = line.indexOf(":");
  if (separatorIndex === -1) {
    return null;
  }

  const keyPart = line.slice(0, separatorIndex);
  const valuePart = line.slice(separatorIndex + 1);
  const [name, ...rawParams] = keyPart.split(";");
  const params = {};

  for (const rawParam of rawParams) {
    const equalsIndex = rawParam.indexOf("=");
    if (equalsIndex === -1) {
      continue;
    }
    const paramName = rawParam.slice(0, equalsIndex).toUpperCase();
    const paramValue = rawParam.slice(equalsIndex + 1).replace(/^"|"$/g, "");
    params[paramName] = paramValue;
  }

  return {
    name: name.toUpperCase(),
    params,
    value: unescapeIcsText(valuePart),
  };
}

function getTimeZoneDateParts(date, timeZone) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const map = {};
  for (const part of formatter.formatToParts(date)) {
    if (part.type !== "literal") {
      map[part.type] = part.value;
    }
  }
  return {
    year: Number(map.year),
    month: Number(map.month),
    day: Number(map.day),
    hour: Number(map.hour),
    minute: Number(map.minute),
    second: Number(map.second),
  };
}

function zonedTimeToUtcMs({ year, month, day, hour, minute, second }, timeZone) {
  const targetAsUtcMs = Date.UTC(year, month - 1, day, hour, minute, second);
  let guessMs = targetAsUtcMs;

  for (let i = 0; i < 2; i += 1) {
    const observed = getTimeZoneDateParts(new Date(guessMs), timeZone);
    const observedAsUtcMs = Date.UTC(
      observed.year,
      observed.month - 1,
      observed.day,
      observed.hour,
      observed.minute,
      observed.second
    );
    guessMs += targetAsUtcMs - observedAsUtcMs;
  }

  return guessMs;
}

export function parseIcsDate(rawValue, params) {
  if (!rawValue) {
    return null;
  }

  if (/^\d{8}$/.test(rawValue)) {
    const year = Number(rawValue.slice(0, 4));
    const month = Number(rawValue.slice(4, 6));
    const day = Number(rawValue.slice(6, 8));
    return new Date(Date.UTC(year, month - 1, day, 0, 0, 0));
  }

  const match = rawValue.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})?(Z)?$/);
  if (!match) {
    return null;
  }

  const [, y, m, d, hh, mm, ss = "00", utcSuffix] = match;
  const year = Number(y);
  const month = Number(m);
  const day = Number(d);
  const hour = Number(hh);
  const minute = Number(mm);
  const second = Number(ss);

  if (utcSuffix === "Z") {
    return new Date(Date.UTC(year, month - 1, day, hour, minute, second));
  }

  if (params && params.TZID) {
    try {
      return new Date(zonedTimeToUtcMs({ year, month, day, hour, minute, second }, params.TZID));
    } catch {
      // Fall through to UTC parsing.
    }
  }

  return new Date(Date.UTC(year, month - 1, day, hour, minute, second));
}

export function parseIcsEvents(icsText) {
  const lines = unfoldIcsLines(icsText);
  const events = [];
  let current = null;

  for (const line of lines) {
    if (line === "BEGIN:VEVENT") {
      current = {};
      continue;
    }

    if (line === "END:VEVENT") {
      if (current) {
        events.push(current);
      }
      current = null;
      continue;
    }

    if (!current) {
      continue;
    }

    const property = parseIcsProperty(line);
    if (!property) {
      continue;
    }

    switch (property.name) {
      case "SUMMARY":
        current.summary = property.value.trim();
        break;
      case "DESCRIPTION":
        current.description = property.value.trim();
        break;
      case "X-ALT-DESC":
        current.altDescription = property.value.trim();
        break;
      case "LOCATION":
        current.location = property.value.trim();
        break;
      case "URL":
        current.url = property.value.trim();
        break;
      case "DTSTART":
        current.start = parseIcsDate(property.value, property.params);
        break;
      case "DTEND":
        current.end = parseIcsDate(property.value, property.params);
        break;
      default:
        break;
    }
  }

  return events;
}

export function pickNextEvent(events, now) {
  const sorted = events
    .filter((event) => event.start instanceof Date && !Number.isNaN(event.start.getTime()))
    .sort((a, b) => a.start.getTime() - b.start.getTime());

  for (const event of sorted) {
    const end = event.end instanceof Date && !Number.isNaN(event.end.getTime()) ? event.end : event.start;
    if (end.getTime() >= now.getTime()) {
      return event;
    }
  }

  return null;
}

export function getFirstUrl(text) {
  if (!text) {
    return null;
  }
  const match = text.match(/https?:\/\/[^\s<>()]+/i);
  return match ? match[0] : null;
}

function looksLikeSectionHeader(line) {
  return /^(booked by|title|abstract|paper link|speaker)\s*:?\s*$/i.test(line.trim());
}

function sectionKeyFromHeader(line) {
  const normalized = line.trim().replace(/:$/, "").toLowerCase();
  if (normalized === "booked by") {
    return "booked_by";
  }
  if (normalized === "title") {
    return "title";
  }
  if (normalized === "abstract") {
    return "abstract";
  }
  if (normalized === "paper link") {
    return "paper_link";
  }
  if (normalized === "speaker") {
    return "speaker";
  }
  return null;
}

function trimEmptyEdges(lines) {
  if (!Array.isArray(lines)) {
    return [];
  }
  let start = 0;
  let end = lines.length;
  while (start < end && lines[start].trim() === "") {
    start += 1;
  }
  while (end > start && lines[end - 1].trim() === "") {
    end -= 1;
  }
  return lines.slice(start, end);
}

function firstNonEmptyLine(lines) {
  if (!Array.isArray(lines)) {
    return null;
  }
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed) {
      return trimmed;
    }
  }
  return null;
}

function chooseSpeaker(lines) {
  if (!Array.isArray(lines)) {
    return null;
  }
  const candidates = lines.map((line) => line.trim()).filter(Boolean);
  if (candidates.length === 0) {
    return null;
  }
  const nonEmail = candidates.find((line) => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(line));
  return nonEmail || candidates[0];
}

function decodeHtmlEntities(text) {
  const namedEntities = {
    amp: "&",
    apos: "'",
    gt: ">",
    lt: "<",
    nbsp: " ",
    quot: '"',
  };

  return text.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g, (match, entity) => {
    const token = entity.toLowerCase();
    if (token.startsWith("#")) {
      const isHex = token.startsWith("#x");
      const rawCodePoint = token.slice(isHex ? 2 : 1);
      const codePoint = Number.parseInt(rawCodePoint, isHex ? 16 : 10);
      if (Number.isNaN(codePoint)) {
        return match;
      }
      try {
        return String.fromCodePoint(codePoint);
      } catch {
        return match;
      }
    }
    return Object.prototype.hasOwnProperty.call(namedEntities, token) ? namedEntities[token] : match;
  });
}

function normalizeDescriptionForParsing(description) {
  if (!description) {
    return "";
  }

  let normalized = description.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  normalized = normalized.replace(/<\s*br\s*\/?\s*>/gi, "\n");
  normalized = normalized.replace(/<\s*\/\s*(p|div|li|tr|td|th|h[1-6]|ul|ol)\s*>/gi, "\n");
  normalized = normalized.replace(/<\s*(p|div|li|tr|td|th|h[1-6]|ul|ol)(\s[^>]*)?>/gi, "\n");
  normalized = normalized.replace(/<[^>]+>/g, "");
  normalized = decodeHtmlEntities(normalized);
  normalized = normalized
    .split("\n")
    .map((line) => line.trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return normalized;
}

export function parseDescriptionSections(description) {
  const sections = {};
  if (!description) {
    return sections;
  }

  const lines = normalizeDescriptionForParsing(description).split("\n");
  let currentSection = null;
  for (const line of lines) {
    const inlineHeaderMatch = line.match(/^(booked by|title|abstract|paper link|speaker)\s*:?\s+(.+)$/i);
    if (inlineHeaderMatch) {
      currentSection = sectionKeyFromHeader(inlineHeaderMatch[1]);
      if (currentSection && !sections[currentSection]) {
        sections[currentSection] = [];
      }
      if (currentSection) {
        sections[currentSection].push(inlineHeaderMatch[2]);
      }
      continue;
    }

    if (looksLikeSectionHeader(line)) {
      currentSection = sectionKeyFromHeader(line);
      if (currentSection && !sections[currentSection]) {
        sections[currentSection] = [];
      }
      continue;
    }

    if (!currentSection) {
      continue;
    }
    sections[currentSection].push(line);
  }

  return sections;
}

const ABSTRACT_BOILERPLATE_PATTERNS = [
  /^youtube\s+live\s+session/i,
  /^interpretable\s+deep\s+learning\s+website/i,
  /^join\s+(with\s+)?google\s+meet/i,
  /^join\s+zoom\s+meeting/i,
  /^learn\s+more\s+about\s+meet/i,
  /^https?:\/\//i,
];

function truncateAtBoilerplate(lines) {
  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (trimmed && ABSTRACT_BOILERPLATE_PATTERNS.some((pattern) => pattern.test(trimmed))) {
      return lines.slice(0, i);
    }
  }
  return lines;
}

export function parseSessionFields(description) {
  const sections = parseDescriptionSections(description);
  const title = firstNonEmptyLine(sections.title);
  const abstractLines = trimEmptyEdges(truncateAtBoilerplate(sections.abstract || []));
  const abstract = abstractLines.length > 0 ? abstractLines.join("\n").trim() : null;
  const speaker = chooseSpeaker(sections.booked_by) || chooseSpeaker(sections.speaker);
  const paperUrl = getFirstUrl((sections.paper_link || []).join("\n"));

  return {
    title,
    abstract,
    speaker,
    paper_url: paperUrl || null,
  };
}

function countExtractedFields(fields) {
  let score = 0;
  if (fields.title) {
    score += 1;
  }
  if (fields.speaker) {
    score += 1;
  }
  if (fields.abstract) {
    score += 1;
  }
  if (fields.paper_url) {
    score += 1;
  }
  return score;
}

export function normalizeNextSession(event) {
  const candidateDescriptions = [event.description, event.altDescription]
    .filter((value) => typeof value === "string")
    .map((value) => value.trim())
    .filter((value) => value.length > 0);

  const parsedCandidates = candidateDescriptions.map((description) => ({
    description,
    fields: parseSessionFields(description),
  }));

  parsedCandidates.sort((left, right) => {
    const scoreDifference = countExtractedFields(right.fields) - countExtractedFields(left.fields);
    if (scoreDifference !== 0) {
      return scoreDifference;
    }
    return right.description.length - left.description.length;
  });

  const bestCandidate = parsedCandidates[0] || { description: "", fields: {} };
  const sessionFields = bestCandidate.fields;
  const start = event.start instanceof Date && !Number.isNaN(event.start.getTime()) ? event.start : null;
  const defaultEnd = start ? new Date(start.getTime() + 60 * 60 * 1000) : null;
  const end = event.end instanceof Date && !Number.isNaN(event.end.getTime()) ? event.end : defaultEnd;

  return {
    title: sessionFields.title || (event.summary && event.summary.trim()) || SESSION_TBD,
    speaker: sessionFields.speaker || SESSION_TBD,
    abstract: sessionFields.abstract || SESSION_TBD,
    description: sessionFields.abstract || SESSION_TBD,
    paper_url: sessionFields.paper_url || null,
    start: start ? start.toISOString() : null,
    end: end ? end.toISOString() : null,
    location: event.location || "Online",
    meeting_url: YOUTUBE_LIVE_URL,
    event_url: event.url || SHARABLE_CALENDAR_URL,
  };
}

export function downloadText(url, redirectsLeft = 4) {
  return new Promise((resolve, reject) => {
    const request = https.get(
      url,
      {
        headers: {
          "User-Agent": "interpretabledeeplearning-calendar-sync/1.0",
        },
      },
      (response) => {
        const statusCode = response.statusCode || 0;
        const redirectLocation = response.headers.location;

        if (statusCode >= 300 && statusCode < 400 && redirectLocation) {
          response.resume();
          if (redirectsLeft <= 0) {
            reject(new Error("Calendar fetch failed due to too many redirects"));
            return;
          }
          const redirectUrl = new URL(redirectLocation, url).toString();
          resolve(downloadText(redirectUrl, redirectsLeft - 1));
          return;
        }

        if (statusCode < 200 || statusCode >= 300) {
          response.resume();
          reject(new Error(`Calendar fetch failed with HTTP ${statusCode}`));
          return;
        }

        let text = "";
        response.setEncoding("utf8");
        response.on("data", (chunk) => {
          text += chunk;
        });
        response.on("end", () => {
          resolve(text);
        });
      }
    );

    request.setTimeout(15000, () => {
      request.destroy(new Error("Calendar request timed out"));
    });
    request.on("error", reject);
  });
}

export function selectNextSessionFromIcs(icsText, now = new Date()) {
  const events = parseIcsEvents(icsText);
  const nextEvent = pickNextEvent(events, now);

  const datedEvents = events.filter(
    (event) => event.start instanceof Date && !Number.isNaN(event.start.getTime())
  );

  const upcomingEvents = datedEvents
    .filter((event) => {
      const end = event.end instanceof Date && !Number.isNaN(event.end.getTime()) ? event.end : event.start;
      return end.getTime() >= now.getTime();
    })
    .sort((a, b) => a.start.getTime() - b.start.getTime());

  const pastEvents = datedEvents
    .filter((event) => {
      const end = event.end instanceof Date && !Number.isNaN(event.end.getTime()) ? event.end : event.start;
      return end.getTime() < now.getTime();
    })
    .sort((a, b) => b.start.getTime() - a.start.getTime()); // most recent first

  return {
    events,
    nextEvent,
    nextSession: nextEvent ? normalizeNextSession(nextEvent) : null,
    upcomingSessions: upcomingEvents.map(normalizeNextSession),
    pastSessions: pastEvents.map(normalizeNextSession),
  };
}

async function loadIcsText({ icsText, icsFile, icsUrl }) {
  if (typeof icsText === "string") {
    return icsText;
  }
  if (icsFile) {
    return readFile(resolve(icsFile), "utf8");
  }
  return downloadText(icsUrl);
}

export async function buildNextSessionPayload({
  icsText,
  icsFile,
  icsUrl = DEFAULT_ICS_URL,
  now = new Date(),
  debug = false,
} = {}) {
  const sourceText = await loadIcsText({ icsText, icsFile, icsUrl });
  const selection = selectNextSessionFromIcs(sourceText, now);

  if (debug) {
    console.log(`[calendar-sync] parsed events: ${selection.events.length}`);
    const datedEvents = selection.events
      .filter((event) => event.start instanceof Date && !Number.isNaN(event.start.getTime()))
      .sort((a, b) => a.start.getTime() - b.start.getTime());
    console.log(`[calendar-sync] dated events: ${datedEvents.length}`);
    for (const [index, event] of datedEvents.slice(0, 5).entries()) {
      const start = event.start.toISOString();
      const summary = (event.summary || "").trim() || "(empty)";
      console.log(`[calendar-sync] event[${index}] start=${start} summary=${summary}`);
    }
    if (selection.nextEvent && selection.nextEvent.start instanceof Date) {
      console.log(`[calendar-sync] next start: ${selection.nextEvent.start.toISOString()}`);
      console.log(`[calendar-sync] next summary: ${(selection.nextEvent.summary || "").trim() || "(empty)"}`);
      console.log(`[calendar-sync] next extracted title: ${selection.nextSession.title}`);
      console.log(`[calendar-sync] next extracted speaker: ${selection.nextSession.speaker}`);
    } else {
      console.log("[calendar-sync] no upcoming event found");
      console.log("[calendar-sync] note: recurring RRULE entries are not expanded by this parser.");
    }
  }

  return {
    nextSession: selection.nextSession,
    upcomingSessions: selection.upcomingSessions,
    pastSessions: selection.pastSessions,
  };
}

export async function writePayload(payload, outputPath = DEFAULT_OUTPUT_PATH) {
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

function printUsage() {
  const usage = [
    "Usage: node scripts/fetch-reading-group-next-session.mjs [options]",
    "",
    "Options:",
    "  --ics-file <path>   Read ICS from a local file instead of downloading",
    "  --ics-url <url>     Override ICS URL",
    "  --output <path>     Output JSON path (default: assets/data/reading-group-next-session.json)",
    "  --now <ISO>         Use a fixed current time for reproducible debugging",
    "  --debug             Print parser/fetch diagnostics",
    "  --help              Show this help text",
  ];
  console.log(usage.join("\n"));
}

export function parseCliArgs(argv) {
  const options = {
    icsFile: null,
    icsUrl: DEFAULT_ICS_URL,
    outputPath: DEFAULT_OUTPUT_PATH,
    now: new Date(),
    debug: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--help") {
      options.help = true;
      continue;
    }
    if (arg === "--debug") {
      options.debug = true;
      continue;
    }
    if (arg === "--ics-file") {
      options.icsFile = argv[i + 1];
      i += 1;
      continue;
    }
    if (arg === "--ics-url") {
      options.icsUrl = argv[i + 1];
      i += 1;
      continue;
    }
    if (arg === "--output") {
      options.outputPath = argv[i + 1];
      i += 1;
      continue;
    }
    if (arg === "--now") {
      const nowText = argv[i + 1];
      i += 1;
      options.now = new Date(nowText);
      if (Number.isNaN(options.now.getTime())) {
        throw new Error(`Invalid --now value: ${nowText}`);
      }
      continue;
    }
    throw new Error(`Unknown argument: ${arg}`);
  }

  return options;
}

export async function runCli(argv = process.argv.slice(2)) {
  const options = parseCliArgs(argv);
  if (options.help) {
    printUsage();
    return;
  }

  const payload = {
    generated_at: new Date().toISOString(),
    source: {
      calendar_id: CALENDAR_ID,
      sharable_url: SHARABLE_CALENDAR_URL,
      ics_url: options.icsUrl,
    },
    next_session: null,
    upcoming_sessions: [],
    past_sessions: [],
  };

  try {
    const result = await buildNextSessionPayload({
      icsFile: options.icsFile,
      icsUrl: options.icsUrl,
      now: options.now,
      debug: options.debug,
    });
    payload.next_session = result.nextSession;
    payload.upcoming_sessions = result.upcomingSessions;
    payload.past_sessions = result.pastSessions;
  } catch (error) {
    payload.error = getErrorMessage(error);
    if (options.debug && error instanceof Error && error.stack) {
      console.error(error.stack);
    }
  }

  await writePayload(payload, options.outputPath);
  await writePayload(payload, DEFAULT_DATA_OUTPUT_PATH);
  if (payload.next_session) {
    console.log(`Saved next session: ${payload.next_session.title} (${payload.upcoming_sessions.length} upcoming total)`);
  } else {
    console.log("Saved empty next-session payload (calendar unavailable or no upcoming events).");
  }
}

const isMain =
  process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href;

if (isMain) {
  runCli().catch(async (error) => {
    const fallbackPayload = {
      generated_at: new Date().toISOString(),
      source: {
        calendar_id: CALENDAR_ID,
        sharable_url: SHARABLE_CALENDAR_URL,
        ics_url: DEFAULT_ICS_URL,
      },
      next_session: null,
      upcoming_sessions: [],
      past_sessions: [],
      error: getErrorMessage(error),
    };
    await writePayload(fallbackPayload, DEFAULT_OUTPUT_PATH);
    await writePayload(fallbackPayload, DEFAULT_DATA_OUTPUT_PATH);
    console.error(fallbackPayload.error);
  });
}
