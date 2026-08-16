# Exam Introductions — Slice Spec

**Status:** done

## Problem Statement

The participant intro page shows static boilerplate rules. PROJECT_OVERVIEW scopes configurable introductions ("aturan, cara menjawab, waktu, dan informasi tambahan"), and the sidebar has reserved an "Introduction Ujian" entry (`/dashboard/exam-introductions`) that 404s.

## Solution

Admins write a per-schedule introduction as a rich-text (TipTap) document, stored on `exam_schedule.introduction` (jsonb). The content is governed by a dedicated `INTRODUCTION_POLICY` in the content-policy module (ADR-0004 single source): paragraphs, headings, lists, blockquote, code blocks, and text with inline marks (bold, italic, underline, strike, code, link) — no images, math, or tables. The participant intro page renders the stored document when present, falling back to the current default text when empty.

## User Stories

1. As an admin, I want to write a rich-text introduction for a schedule, so that participants see tailored rules.
2. As an admin, I want a dedicated management page listing schedules with their introduction status, so that I can find and edit introductions quickly.
3. As a participant, I want the stored introduction rendered on the intro page, and the default text when none is set.

## Implementation Decisions

- `exam_schedule.introduction` jsonb (nullable TipTap doc), migration 0012. Per-schedule — the intro describes this exam run.
- `INTRODUCTION_POLICY`: nodes paragraph/heading/bulletList/orderedList/listItem/blockquote/codeBlock/text; marks bold/italic/underline/strike/code/link. No images/math/tables — rules text does not need the media pipeline.
- The editor derives from the same policy: `EDITOR_CONFIGS["introduction"]` (narrowed starter kit + Underline + Link) with an `IntroToolbar` (P, H1–3, marks, lists, blockquote, code, link). Save-time validation via `validateContent(INTRODUCTION_POLICY, …)`; render via `renderContentHtml` + a new `sanitizeIntroductionHtml`.
- Admin UI: `/dashboard/exam-introductions` hub (searchable/paginated schedules with intro status) + `[scheduleId]` editor page; the schedule create/edit form shows the intro's presence with an "Atur Introduction" link (the lazy editor is not embedded into the RHF form).
- Participant intro page renders the stored doc via `IntroductionRenderer`, else the default text.

## Out of Scope

Images/math/tables in introductions, per-package introductions, intro scheduling variants, translation.

## Further Notes

Released as v0.11.0. Ticket files: `.scratch/exam-introductions/issues/01-*.md` – `03-*.md`.
