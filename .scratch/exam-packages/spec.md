# Exam Packages — Slice Spec

**Status:** done

## Problem Statement

Admins need to compose exam packages — named collections of questions with exam configuration — so scheduled exams can draw from the question banks.

## Solution

An exam package holds a name, optional description, optional duration, shuffling flag, and optional pass score, plus an explicit ordered list of questions selected from the eligible set (active questions in active banks). Composition is explicit and auditable; no dynamic filter-based packages.

## User Stories

1. As an admin, I want to create a package with a name and optional configuration, so that scheduled exams have a content source.
2. As an admin, I want to edit a package's configuration, so that mistakes are correctable.
3. As an admin, I want to see packages in a searchable/sortable/paginated list with question counts, so that packages are navigable.
4. As an admin, I want to add eligible questions to a package in order, so that the exam content is controlled.
5. As an admin, I want only active questions from active banks offered for selection, so that archived content can never leak into packages.
6. As an admin, I want to reorder questions (move up/down), so that the sequence is adjustable.
7. As an admin, I want to remove questions from a package, so that composition stays accurate.
8. As an admin, I want duplicates rejected, so that a question cannot appear twice.
9. As an admin, I want to delete a package, keeping the questions intact in their banks, so that mistakes can be removed safely.
10. As a future schedule builder, I want packages available for scheduling, so that scheduled exams can reference them.

## Implementation Decisions

- Schema 0005: `exam_package` (name, description?, durationMinutes?, shuffle default false, passScore numeric 8,2) and `exam_question` (examId FK cascade, questionId FK restrict, position, UNIQUE(examId, questionId)).
- Explicit ordered-list model; eligibility enforced at the query level (question + bank `archived_at IS NULL`) and re-checked server-side on add. See ADR-0008.
- No per-question score field — deferred to the Aturan Penilaian slice (ADR-0001, ADR-0008).
- `swapPositions` lives in `lib/exam-packages/order.ts` (plain function — non-async exports are rejected in `"use server"` modules).
- Selection screen fetches eligible questions per bank via a server action; filtering is local on the loaded set.
- Empty numeric form fields (NaN via `valueAsNumber`) are preprocessed to absent.
- A duplicate-add response is treated as already-added (a landed insert with a lost response must not leave the UI stale).

## Out of Scope

Schedules, access rules, introductions, sessions, attempts, results, and detailed scoring rules are separate roadmap slices. Participant groups are deferred.

## Further Notes

Released as v0.4.0. Ticket files: `.scratch/exam-packages/issues/01-*.md` – `03-*.md`.
