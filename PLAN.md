# GuitIQ MVP Build Plan

> **Living document** — updated after every feature implementation.
> Last updated: 2026-04-18

---

## 1. Product Summary

GuitIQ is a mobile-first web app that trains one skill: **hearing something and immediately finding it on the guitar**. Every interaction starts with audio. The user hears a note, interval, chord, or short melodic fragment, then must locate and "play" it on an interactive fretboard. The system evaluates their answer, gives instant feedback, and adapts difficulty over time. Sessions are 3–5 minutes — short enough for a coffee break, effective enough to build real ear-to-fretboard instinct.

**What GuitIQ explicitly does NOT do:**
- Fretboard memorization drills (no "name the note at fret 7, string 3")
- Note naming quizzes (no "what note is this?" with text answers)
- Scale or chord diagram visualization
- Music theory lessons or curriculum
- Tab reading or sight-reading exercises
- Any interaction that starts with a visual prompt instead of audio

The test for every feature: **does the user hear something first and respond by playing?** If not, it doesn't belong in GuitIQ.

---

## 2. Core Interaction Model

Every challenge in GuitIQ follows a single loop:

```
HEAR → LOCATE → PLAY → FEEDBACK → ADAPT
```

### Step 1: HEAR — Audio Playback
- The system plays a sound through the browser using Tone.js with guitar samples
- Sound types (unlocked progressively): single note, interval (two notes), chord, short melodic phrase
- The user can tap a "replay" button to hear the sound again (up to 3 replays per challenge)
- Audio is the ONLY prompt — no visual hint, no note name, no fretboard highlight

### Step 2: LOCATE — User Thinks
- The user internally translates what they heard into a fretboard position
- No timer pressure in v1 (speed will be a future difficulty axis)

### Step 3: PLAY — Fretboard Input
- The user taps the position(s) on an interactive fretboard where they believe the sound lives
- For single notes: tap one fret
- For intervals: tap two frets in sequence
- For chords: tap multiple frets (future milestone)
- The fretboard plays back the tapped note(s) so the user hears their own answer

### Step 4: FEEDBACK — Evaluation
- Immediate visual + audio feedback:
  - **Correct:** green highlight on tapped position, confirmation sound, "+1" animation
  - **Incorrect:** red highlight on tapped position, correct position(s) revealed in blue, the correct sound replays automatically
- Multiple valid positions exist for the same pitch on guitar — ALL correct positions are accepted
- For intervals: both the interval quality AND the fret positions must be correct

### Step 5: ADAPT — Difficulty Progression
- Difficulty adjusts based on rolling accuracy (last 20 challenges)
- Axes of difficulty:
  - Note range (open position → full neck)
  - Challenge type (single notes → intervals → chords)
  - Number of replays allowed
  - Inclusion of accidentals
  - Interval size range

---

## 3. MVP Scope (STRICT)

### Included
| Feature | Why it's essential |
|---|---|
| Audio playback engine | Core of the product — nothing works without it |
| "Find the Note" challenge | Simplest audio→play loop; proves the concept |
| "Find the Interval" challenge | Second-order ear training; validates the loop generalizes |
| Interactive fretboard (input) | The user's instrument — how they "play" their answer |
| Audio feedback on tap | User hears what they tapped, closing the ear→hand→ear loop |
| Correct/incorrect evaluation | Validates the user's ear-to-fretboard translation |
| Session flow (5–10 challenges) | Structured short practice, not infinite scroll |
| Basic difficulty curve | Keeps the user in a productive challenge zone |
| Local progress persistence | User sees they're improving; streak motivation |

### Explicitly Excluded from v1
- ❌ Chord library / chord diagrams
- ❌ Scale visualizer / scale practice mode
- ❌ Theory lessons or explanations
- ❌ Note naming (text-based answers of any kind)
- ❌ Fretboard memorization mode
- ❌ User accounts / cloud sync / auth
- ❌ Social features / leaderboards
- ❌ Microphone-based pitch detection
- ❌ MIDI input
- ❌ Payments / monetization

---

## 4. Feature Specifications

---

### F-01 · Audio Playback Engine

**Goal:** Play guitar-like sounds in the browser reliably, especially on mobile.

**User story:** As a user starting a challenge, I hear a clear guitar note (or notes) played through my phone speaker so I can identify what to play.

**Acceptance criteria:**
- Can play any single note from E2 (low E open) to E5 (12th fret high E) using guitar samples
- Can play two notes in sequence (arpeggiated interval) with configurable delay (default 400ms)
- Can play multiple notes simultaneously (chord strum)
- Audio context initializes only after a user gesture (tap "Start Session")
- Graceful fallback: if samples fail to load, use Tone.js synth with a warm tone
- Latency from trigger to audible sound < 100ms on mobile Chrome/Safari
- Replay button re-triggers the exact same sound

**Implementation notes:**
- `lib/audio/engine.ts` — singleton wrapping Tone.js
- `initAudio()` — called once on first user tap, resolves a promise
- `playNote(note: string, duration?: number)` — plays a single note
- `playSequence(notes: string[], delay?: number)` — plays notes in order
- `playChord(notes: string[])` — plays notes simultaneously
- Guitar samples from an open-source soundfont (e.g., `gleitz/midi-js-soundfonts`), lazy-loaded
- Tone.js dynamically imported to keep initial bundle small
- All audio functions return Promises (resolved when playback starts)

**Testing requirements:**
- Unit test: `noteToFrequency()`, `midiToNote()`, `noteToMidi()` pure functions
- Integration test (mocked Tone.js): `playNote` triggers sampler with correct note
- Integration test (mocked): `playSequence` triggers notes in correct order with correct delay
- Do NOT test actual audio output — mock at the Tone.js boundary
- Manual QA on iOS Safari + Android Chrome (documented in `docs/manual-qa.md`)

---

### F-02 · Interactive Fretboard (Input Device)

**Goal:** Provide a tappable guitar fretboard that serves as the user's answer input AND plays back the tapped note so they hear their own response.

**User story:** As a user who just heard a note, I tap where I think it is on the fretboard. I hear the note I tapped, and the system tells me if I'm right.

**Acceptance criteria:**
- Renders 6 strings × frets 0–12 (standard tuning, configurable later)
- Each fret position is tappable with a minimum 44×44px touch target
- Tapping a fret:
  1. Plays the corresponding note via the audio engine (so the user hears their answer)
  2. Fires an `onSelect({string, fret, note})` callback
- Fret markers at positions 3, 5, 7, 9, 12 (double dot)
- Open string labels (E A D G B E)
- Visual states: `default`, `selected`, `correct`, `incorrect`, `revealed`
- Horizontally scrollable on narrow screens if needed
- NO note name labels on frets (this is not a memorization tool)

**Implementation notes:**
- `components/Fretboard.tsx` — pure presentational component
- `lib/music/fretboard.ts` — `getNoteAtPosition(string: number, fret: number): string`
- `lib/music/notes.ts` — standard tuning, note-to-MIDI mapping, enharmonic equivalence
- CSS Grid layout, mobile-first
- The fretboard is an INPUT device, not a teaching diagram

**Testing requirements:**
- Unit test: `getNoteAtPosition` for all 6×13 = 78 positions against known values
- Unit test: enharmonic equivalence (`C#` === `Db` for answer evaluation)
- Component test: correct number of fret cells rendered (78)
- Component test: tapping a cell fires `onSelect` with correct `{string, fret, note}`
- Component test: visual states apply correct CSS classes
- Component test: tapping a cell calls `playNote` on the audio engine
- Accessibility: all fret cells have `role="button"` and `aria-label` (e.g., "String 1, Fret 5")

---

### F-03 · "Find the Note" Challenge Mode

**Goal:** The system plays a single guitar note. The user must find and tap it on the fretboard.

**User story:** As a user, I hear a guitar note and I tap where I think it is on the fretboard. If I'm right, I feel a hit of accomplishment. If I'm wrong, I see (and hear) the correct answer so I learn.

**Acceptance criteria:**
- System selects a random note within the current difficulty range
- Note is played via the audio engine (no visual hint)
- User taps a fret position on the fretboard
- Tapped position plays back its note (user hears their answer)
- Evaluation: correct if the tapped position produces the same pitch (ANY valid fret position accepted)
- Feedback:
  - Correct: tapped position glows green, success sound, score +1
  - Incorrect: tapped position glows red, ONE correct position revealed (blue glow), correct note replays
- "Replay" button (top of screen) replays the target note (max 3 replays)
- "Next" button advances to the next challenge
- Challenge is stateless — no dependency on previous challenges

**Implementation notes:**
- `lib/challenges/findTheNote.ts`:
  - `generateFindTheNoteChallenge(difficulty: DifficultyConfig): FindTheNoteChallenge`
  - `evaluateFindTheNote(challenge, answer: {string, fret}): EvaluationResult`
  - `getAllPositionsForNote(note: string): {string, fret}[]` — returns all fretboard positions that produce the target pitch
- Difficulty config controls: min/max fret, which strings to include, accidentals on/off
- Challenge type:
  ```ts
  type FindTheNoteChallenge = {
    type: 'find-the-note'
    targetNote: string       // e.g., "A3"
    targetMidi: number       // 57
    validPositions: {string: number, fret: number}[]
    difficulty: DifficultyConfig
  }
  ```

**Testing requirements:**
- Unit test: `generateFindTheNoteChallenge` returns valid note within difficulty range
- Unit test: `evaluateFindTheNote` — correct on any valid position, incorrect on wrong position
- Unit test: `getAllPositionsForNote("A3")` returns all correct fret/string combos
- Component test: challenge plays audio on mount, fretboard tap triggers evaluation, feedback renders
- E2E test: complete 3 "Find the Note" challenges in sequence

---

### F-04 · "Find the Interval" Challenge Mode

**Goal:** The system plays two notes in sequence. The user must tap both positions on the fretboard.

**User story:** As a user, I hear two notes played one after another. I tap where I think each one is on the fretboard, in order. The system tells me if I found both correctly.

**Acceptance criteria:**
- System selects a random interval within difficulty range (e.g., minor 3rd, perfect 5th)
- Both notes play in sequence (arpeggiated, ~400ms gap)
- User taps two fret positions in order (first note, then second note)
- Each tap plays back its note
- Evaluation: correct if both tapped positions produce the correct pitches (ANY valid positions)
- Feedback:
  - Both correct: both glow green, success sound
  - Partially correct: correct note green, incorrect note red + correct position revealed
  - Both wrong: both red, both correct positions revealed
- Interval name is NOT shown before or during the challenge (this is not a naming quiz)
- After feedback, the interval name is shown as educational reinforcement (e.g., "That was a Perfect 5th")
- "Replay" button replays the interval

**Implementation notes:**
- `lib/challenges/findTheInterval.ts`:
  - `generateFindTheIntervalChallenge(difficulty): FindTheIntervalChallenge`
  - `evaluateFindTheInterval(challenge, answers: [{string, fret}, {string, fret}]): EvaluationResult`
- `lib/music/intervals.ts` — interval definitions (name, semitones, common guitar shapes)
- Difficulty config controls: which intervals to include, note range, string restrictions

**Testing requirements:**
- Unit test: `generateFindTheIntervalChallenge` returns valid interval within config
- Unit test: `evaluateFindTheInterval` — both correct, first only, second only, neither
- Unit test: interval semitone calculations
- Component test: two-tap sequence captured correctly, feedback renders for all states
- E2E test: complete 3 interval challenges

---

### F-05 · Session Flow

**Goal:** Chain challenges into a focused 3–5 minute session with a clear start, progress, and end.

**User story:** As a user, I tap "Start Session" and get a focused set of challenges. I see my progress (e.g., "4/8"), and at the end I see how I did.

**Acceptance criteria:**
- Session contains N challenges (default: 8, configurable via settings)
- Challenge type distribution based on unlocked modes and settings
- Progress indicator shows current position (e.g., "4 / 8")
- Session can include only unlocked challenge types
- Completion screen shows: correct count, accuracy %, session time
- "Play Again" and "Home" buttons on completion screen
- Session state resets cleanly on new session

**Implementation notes:**
- `lib/session/sessionGenerator.ts`:
  - `generateSession(config: SessionConfig): Challenge[]`
- `store/sessionStore.ts` (Zustand):
  - State: `challenges[]`, `currentIndex`, `answers[]`, `startTime`, `status`
  - Actions: `startSession()`, `submitAnswer()`, `nextChallenge()`, `completeSession()`
- No timer pressure in v1 — elapsed time is tracked but doesn't affect scoring

**Testing requirements:**
- Unit test: `generateSession` returns correct count and type mix
- Unit test: session store state machine (idle → active → answering → feedback → next → complete)
- Component test: progress bar updates, completion screen shows correct stats
- E2E test: complete a full 8-challenge session

---

### F-06 · Feedback & Scoring System

**Goal:** Give the user clear, instant, audio+visual feedback on every answer, and track performance.

**User story:** As a user, I want to immediately know if I got it right, hear the correct answer if I didn't, and see my score improving over time.

**Acceptance criteria:**
- Per-challenge feedback renders within 100ms of answer submission
- Correct answer: green highlight + short success chime + the correct note replays
- Incorrect answer: red highlight + correct position(s) revealed in blue + correct note replays
- End-of-session: correct/total, accuracy %, best streak within session
- Feedback ALWAYS includes audio (the user hears the right answer, reinforcing the ear)

**Implementation notes:**
- `components/ChallengeFeedback.tsx` — visual feedback overlay
- Feedback sounds: short, distinct chimes (correct vs incorrect), separate from guitar samples
- `lib/scoring.ts` — `calculateSessionScore(answers: Answer[]): SessionScore`

**Testing requirements:**
- Unit test: `calculateSessionScore` — edge cases (0%, 100%, mixed)
- Component test: feedback renders correct/incorrect/revealed states
- Component test: feedback triggers audio playback (mocked)

---

### F-07 · Difficulty Progression

**Goal:** Automatically adjust challenge difficulty so the user stays in a productive learning zone.

**User story:** As a user, I want the app to get harder as I improve and easier if I'm struggling, without me having to configure anything.

**Acceptance criteria:**
- Difficulty adjusts based on rolling accuracy over the last 20 answers
- Accuracy > 80%: difficulty increases one step
- Accuracy < 50%: difficulty decreases one step
- Difficulty axes (adjusted independently):
  - Fret range: 0–4 → 0–7 → 0–12
  - Accidentals: off → on
  - Interval pool: P5/P4/Oct → add M3/m3 → add M2/m2 → add tritone
  - Replay limit: 3 → 2 → 1
- Current difficulty level persisted to localStorage

**Implementation notes:**
- `lib/difficulty/difficultyEngine.ts`:
  - `calculateDifficulty(history: AnswerHistory[]): DifficultyConfig`
  - `DifficultyConfig` type defines all axes
- `store/progressStore.ts` — persists answer history + current difficulty (Zustand + localStorage)

**Testing requirements:**
- Unit test: `calculateDifficulty` — high accuracy → harder, low accuracy → easier, edge cases
- Unit test: difficulty never goes below minimum or above maximum
- Unit test: each axis adjusts independently
- Integration test: complete 20 correct answers → verify difficulty increased

---

### F-08 · Local Progress Persistence

**Goal:** Persist session history and difficulty state across browser sessions.

**User story:** As a returning user, I want to pick up where I left off in difficulty, and see my streak and accuracy trends.

**Acceptance criteria:**
- Persists: current difficulty config, answer history (last 100), session count, current streak, best streak, accuracy per challenge type
- Data survives page refresh via localStorage
- Simple progress screen at `/progress` showing key metrics
- Data can be cleared from settings

**Implementation notes:**
- `store/progressStore.ts` — Zustand with `persist` middleware
- Progress screen: stats grid (streak, sessions, accuracy by mode), no charts in v1
- Streak logic: based on calendar days (UTC), consecutive days with at least one completed session

**Testing requirements:**
- Unit test: streak logic — consecutive days, broken streak, same-day replay, timezone edge cases
- Unit test: accuracy per challenge type calculation
- Component test: progress screen renders all expected metrics
- Integration test: complete session → progressStore updated correctly

---

## 5. Technical Architecture

### Frontend
**Next.js 14 (App Router)** with TypeScript (strict mode). React client components for all interactive UI. File-based routing. Deployed to Vercel.

### Audio System
**Tone.js** is the core audio dependency. Architecture:

```
┌─────────────────────────────────────────────┐
│                 audioEngine.ts               │
│  (singleton, lazy-init on first user tap)    │
├─────────────────────────────────────────────┤
│  Tone.Sampler ← guitar soundfont samples    │
│  (fallback: Tone.PolySynth with warm tone)  │
├─────────────────────────────────────────────┤
│  playNote(note)                             │
│  playSequence(notes[], delay)               │
│  playChord(notes[])                         │
│  playFeedbackChime(type: 'correct'|'wrong') │
└─────────────────────────────────────────────┘
```

- Samples lazy-loaded from `/public/samples/` (guitar soundfont, ~2MB)
- Audio context created on first `initAudio()` call (gated behind user gesture)
- All audio functions are async and return when playback starts
- Feedback chimes are short sine-wave tones (no samples needed)
- Dynamic import of Tone.js: `const Tone = await import('tone')`

**Browser compatibility:** iOS Safari 16+, Android Chrome 120+. Both require user gesture for AudioContext. Tested manually on real devices.

### Styling
**Tailwind CSS v3** — utility-first, mobile-first breakpoints, custom design tokens.

### State Management
**Zustand** — three stores:
- `sessionStore` — current session state machine (challenge queue, answers, timing)
- `settingsStore` — user preferences (session length, challenge types) — persisted
- `progressStore` — history, streaks, difficulty — persisted

### Backend / Auth
**None in v1.** All state in localStorage. No server. No auth. No database.

### Deployment
**Vercel** — zero-config Next.js hosting, free tier, preview deploys on PRs.

### Testing Stack
| Layer | Tool | What it tests |
|---|---|---|
| Unit | Vitest | Pure logic: note math, challenge generation, evaluation, scoring, difficulty |
| Component | React Testing Library + Vitest | UI rendering, user interaction, callbacks |
| E2E | Playwright | Full user journeys: start session → complete challenges → see results |
| Accessibility | axe-core via Playwright | WCAG 2.1 AA on all routes |
| Audio | Mocked Tone.js | Verify correct notes/sequences are triggered (never test actual sound) |

### Package Manager
**pnpm** — fast, strict, deterministic.

### CI
**GitHub Actions** — lint + typecheck + unit tests on every push; E2E on PRs to `main`.

---

## 6. Milestone Plan

### Milestone 0 — Repo, Tooling, CI, Test Harness
> **Outcome:** Green CI pipeline with passing placeholder tests. Deploy infrastructure confirmed.

- Scaffold Next.js 14 + TypeScript + Tailwind
- Install Zustand, Tone.js
- Configure Vitest + React Testing Library
- Configure Playwright
- ESLint + Prettier + strict TypeScript
- GitHub Actions CI workflow
- Vercel project linked
- `PLAN.md` committed

---

### Milestone 1 — Audio Engine + Playback
> **Outcome:** User can tap a button and hear a guitar note. Audio works on mobile.

- `lib/audio/engine.ts` — singleton, lazy init
- `playNote()`, `playSequence()`, `playChord()`
- Guitar sample loading (with synth fallback)
- `/dev/audio` test page — buttons to play various notes/intervals
- Unit tests for note/MIDI conversion utilities
- Integration tests for audio engine (mocked Tone.js)
- Manual QA on iOS Safari + Android Chrome

---

### Milestone 2 — Interactive Fretboard Input
> **Outcome:** Tappable fretboard that plays back the tapped note. No challenge logic yet.

- `lib/music/notes.ts` + `lib/music/fretboard.ts`
- `<Fretboard>` component — tap → hear note → callback fires
- `/dev/fretboard` test page
- Unit tests for `getNoteAtPosition`
- Component tests for `<Fretboard>`

---

### Milestone 3 — First Playable Challenge (Find the Note)
> **Outcome:** User hears a note, taps the fretboard to find it, gets feedback. The core loop works.

- `lib/challenges/findTheNote.ts`
- Challenge UI: audio prompt → fretboard input → feedback
- `store/sessionStore.ts` — single-challenge flow
- Session page at `/session`
- Landing page with "Start Session" CTA
- Unit tests for challenge generation + evaluation
- Component tests for challenge flow
- E2E test: complete 3 note challenges

---

### Milestone 4 — Session Flow + Feedback + Scoring
> **Outcome:** User completes a full 8-challenge session with progress bar and completion screen.

- Session generator (multi-challenge queue)
- Progress bar during session
- Completion screen with stats
- Feedback chimes (correct/incorrect)
- `lib/scoring.ts`
- E2E test: full 8-challenge session

---

### Milestone 5 — Interval Challenge + Difficulty + Persistence
> **Outcome:** Two challenge modes, adaptive difficulty, progress persists across sessions.

- `lib/challenges/findTheInterval.ts`
- Interval challenge UI (two-tap input)
- `lib/difficulty/difficultyEngine.ts`
- `store/progressStore.ts` (persisted)
- `/progress` screen
- `/settings` screen
- E2E test: mixed-mode session with difficulty adjustment

---

## 7. Living Implementation Checklist

### Milestone 0 — Repo + Tooling + CI
- [x] **M0.1** Scaffold Next.js 14 app (`pnpm create next-app@latest`)
- [x] **M0.2** Configure Tailwind CSS v3
- [x] **M0.3** Install Zustand
- [x] **M0.4** Install Tone.js
- [x] **M0.5** Configure Vitest + React Testing Library
  - [x] `vitest.config.ts`
  - [x] `setupTests.ts` with `@testing-library/jest-dom`
  - [x] One passing placeholder test
- [x] **M0.6** Configure Playwright
  - [x] `playwright.config.ts`
  - [x] One passing smoke test (visit `/`, assert page loads)
- [x] **M0.7** ESLint + Prettier configuration
- [x] **M0.8** TypeScript strict mode
- [x] **M0.9** GitHub Actions CI (`.github/workflows/ci.yml`)
  - [x] Lint + type-check job
  - [x] Unit/component test job (Vitest)
  - [x] E2E test job (Playwright)
- [x] **M0.10** Link Vercel project, confirm deploy
- [x] **M0.11** Commit `PLAN.md`

### Milestone 1 — Audio Engine
- [ ] **M1.1** Create `lib/music/notes.ts` — note names, MIDI mapping, enharmonic equivalence
- [ ] **M1.2** Unit tests for `noteToMidi`, `midiToNote`, `isEnharmonic`
- [ ] **M1.3** Create `lib/audio/engine.ts` — Tone.js singleton, `initAudio()`
- [ ] **M1.4** Implement `playNote(note: string)`
- [ ] **M1.5** Implement `playSequence(notes: string[], delay?: number)`
- [ ] **M1.6** Implement `playChord(notes: string[])`
- [ ] **M1.7** Implement `playFeedbackChime(type: 'correct' | 'incorrect')`
- [ ] **M1.8** Guitar sample loading with synth fallback
- [ ] **M1.9** Integration tests (mocked Tone.js): verify correct note names passed to sampler
- [ ] **M1.10** Create `/dev/audio` test page — buttons to play C3, E3, G3, C major chord, P5 interval
- [ ] **M1.11** Create `docs/manual-qa.md` — iOS/Android audio QA checklist
- [ ] **M1.12** Manual QA on real devices

### Milestone 2 — Fretboard Input
- [ ] **M2.1** Create `lib/music/fretboard.ts` — `getNoteAtPosition(string, fret)`, `getAllPositionsForNote(note)`, standard tuning config
- [ ] **M2.2** Unit tests for `getNoteAtPosition` (all 78 positions)
- [ ] **M2.3** Unit tests for `getAllPositionsForNote` (spot-check 12 notes)
- [ ] **M2.4** Build `<Fretboard>` component
  - [ ] 6 strings × 13 fret positions (0–12)
  - [ ] `onSelect({string, fret, note})` callback
  - [ ] Plays tapped note via audio engine
  - [ ] `highlights` prop for visual states
  - [ ] Fret markers at 3, 5, 7, 9, 12
  - [ ] Open string labels
  - [ ] NO note name labels on frets
  - [ ] Min 44px touch targets
  - [ ] `role="button"` + `aria-label` on each cell
- [ ] **M2.5** Component tests for `<Fretboard>`
  - [ ] Correct cell count
  - [ ] `onSelect` fires with correct payload
  - [ ] Tapping calls `playNote`
  - [ ] Highlight states apply correct classes
- [ ] **M2.6** Create `/dev/fretboard` dev page
- [ ] **M2.7** Manual mobile QA — touch targets, scroll, layout on 375px

### Milestone 3 — Find the Note Challenge
- [ ] **M3.1** Create `lib/challenges/findTheNote.ts`
  - [ ] `generateFindTheNoteChallenge(difficulty): FindTheNoteChallenge`
  - [ ] `evaluateFindTheNote(challenge, answer): EvaluationResult`
- [ ] **M3.2** Unit tests: generation produces valid note in range
- [ ] **M3.3** Unit tests: evaluation accepts all valid positions, rejects wrong ones
- [ ] **M3.4** Create `store/sessionStore.ts` (Zustand) — single-challenge state machine
- [ ] **M3.5** Unit tests for session store transitions
- [ ] **M3.6** Build challenge UI components
  - [ ] `<ChallengePrompt>` — "Listen and find this note" + replay button
  - [ ] `<ChallengeFeedback>` — correct/incorrect + revealed position
- [ ] **M3.7** Build `/session` page — plays audio → accepts fretboard tap → shows feedback
- [ ] **M3.8** Build landing page with "Start Session" CTA → navigates to `/session`
- [ ] **M3.9** Component tests for challenge UI
- [ ] **M3.10** E2E test: complete 3 "Find the Note" challenges
- [ ] **M3.11** Axe accessibility check on `/` and `/session`

### Milestone 4 — Full Session + Feedback + Scoring
- [ ] **M4.1** Create `lib/session/sessionGenerator.ts` — `generateSession(config): Challenge[]`
- [ ] **M4.2** Unit tests for `generateSession`
- [ ] **M4.3** Extend `sessionStore` for multi-challenge flow (queue, index, progress)
- [ ] **M4.4** Unit tests for extended session store
- [ ] **M4.5** Build progress bar component (shows "4 / 8")
- [ ] **M4.6** Build session completion screen (correct/total, accuracy, time)
- [ ] **M4.7** Implement `playFeedbackChime` integration (correct/incorrect chimes)
- [ ] **M4.8** Create `lib/scoring.ts` + unit tests
- [ ] **M4.9** Component tests: progress bar, completion screen
- [ ] **M4.10** E2E test: complete full 8-challenge session, verify completion screen

### Milestone 5 — Intervals + Difficulty + Persistence
- [ ] **M5.1** Create `lib/music/intervals.ts` — interval definitions (name, semitones)
- [ ] **M5.2** Create `lib/challenges/findTheInterval.ts`
  - [ ] `generateFindTheIntervalChallenge(difficulty)`
  - [ ] `evaluateFindTheInterval(challenge, answers)`
- [ ] **M5.3** Unit tests for interval challenge generation + evaluation
- [ ] **M5.4** Build interval challenge UI (two-tap sequence input)
- [ ] **M5.5** Component tests for interval challenge
- [ ] **M5.6** Create `lib/difficulty/difficultyEngine.ts` — `calculateDifficulty(history)`
- [ ] **M5.7** Unit tests for difficulty engine (all threshold transitions)
- [ ] **M5.8** Create `store/progressStore.ts` (Zustand + persist)
  - [ ] Streak logic (calendar-day based)
  - [ ] Accuracy per challenge type
  - [ ] Total sessions, answer history (last 100)
- [ ] **M5.9** Unit tests for streak logic
- [ ] **M5.10** Build `/progress` screen — stats grid
- [ ] **M5.11** Build `/settings` screen — session length, challenge types
- [ ] **M5.12** Create `store/settingsStore.ts` (Zustand + persist) + unit tests
- [ ] **M5.13** Integration test: difficulty adjusts after 20 correct answers
- [ ] **M5.14** E2E test: complete mixed-mode session → progress screen updated
- [ ] **M5.15** Lighthouse mobile audit ≥ 85

---

## 8. Testing Strategy

### Philosophy
> Every test must answer: "does the hear→locate→play→feedback loop work correctly?" Tests that don't serve that question are overhead.

### Unit Tests (Vitest)
**What to test:**
- Note/MIDI math: `noteToMidi`, `midiToNote`, `isEnharmonic`, `getNoteAtPosition`, `getAllPositionsForNote`
- Challenge generation: output shape, note within range, valid positions computed
- Challenge evaluation: correct for all valid positions, incorrect for wrong positions
- Interval math: semitone calculations, interval name mapping
- Scoring: accuracy calculation, edge cases
- Difficulty engine: threshold transitions, bounds checking
- Streak logic: consecutive days, broken streak, same-day

**What NOT to unit test:** React components, audio output, localStorage, Tone.js internals.

### Component Tests (React Testing Library + Vitest)
**What to test:**
- `<Fretboard>`: renders correct cells, fires `onSelect`, applies highlight classes, triggers `playNote` (mocked)
- `<ChallengePrompt>`: renders replay button, calls audio engine on mount
- `<ChallengeFeedback>`: renders correct/incorrect/revealed states, triggers feedback chime
- `<SessionCompletion>`: displays correct stats
- `<ProgressScreen>`: renders all metrics

**Mocking strategy:** Mock `lib/audio/engine.ts` at the module level. Never let component tests touch Tone.js.

### Integration Tests (Vitest)
- Session store: idle → start → answer → feedback → next → complete
- Progress store: session complete → stats updated → difficulty recalculated
- Settings change → session generator respects new config

### E2E Tests (Playwright)
Keep the E2E suite small and focused on the core loop:

| Test | What it proves |
|---|---|
| Landing → Start → Complete 3 note challenges | Core hear→play loop works |
| Complete full 8-challenge session → completion screen | Session flow works end-to-end |
| Complete interval challenges (two-tap) | Interval mode works |
| Progress screen shows updated stats after session | Persistence works |
| Settings change persists on reload | Settings persistence works |

**E2E audio strategy:** Mock the audio engine in Playwright tests (inject mock via `window.__TEST_AUDIO_MOCK__`). We test that the correct audio functions are called, not that sound comes out.

### Accessibility Tests
- `@axe-core/playwright` on `/`, `/session`, `/progress`, `/settings`
- Fretboard cells have `role="button"` and meaningful `aria-label`
- Focus management during challenge flow

### Audio-Specific Testing Rules
1. **Never test actual audio output** — it's not deterministic and depends on hardware
2. **Mock Tone.js** at the import boundary in all automated tests
3. **Test that the right notes are triggered** — verify function calls and arguments
4. **Manual QA on real devices** is mandatory for audio-related milestones
5. **Document manual QA results** in `docs/manual-qa.md`

### Test Commands
```bash
pnpm test              # Unit + component tests (watch mode)
pnpm test:ci           # Unit + component tests (single run, CI)
pnpm test:coverage     # With coverage report
pnpm e2e               # E2E tests (headed, local dev)
pnpm e2e:ci            # E2E tests (headless, CI)
pnpm typecheck         # TypeScript strict check
pnpm lint              # ESLint
```

### When Tests Must Be Updated
- Every new feature: add tests before marking checklist items complete
- Every bug fix: add a regression test
- Every refactor: existing tests must still pass (if they break, the refactor changed behavior)

---

## 9. Definition of Done

A feature is **done** when:

1. ✅ The hear→locate→play→feedback loop works for that feature
2. ✅ Unit tests cover all pure logic
3. ✅ Component tests cover all UI interactions
4. ✅ E2E test covers the user journey (if applicable)
5. ✅ All tests pass (`pnpm test:ci && pnpm e2e:ci`)
6. ✅ CI is green
7. ✅ `PLAN.md` checklist updated
8. ✅ No axe accessibility violations
9. ✅ Any new tech debt documented in Tech Debt Log

---

## 10. Risk Register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| **Audio latency on mobile** — noticeable delay between tap and sound | High | High | Use Tone.js `Sampler` with pre-buffered notes; test on real devices early (Milestone 1) |
| **iOS Safari audio restrictions** — AudioContext blocked without user gesture | High | High | Gate all audio behind explicit "Start Session" tap; test in Milestone 1 |
| **Sample loading failure** — network issues prevent guitar samples from loading | Medium | High | Implement synth fallback from day one; cache samples via service worker later |
| **Drifting toward memorization UX** — accidentally building note-naming or visual quizzes | High | Critical | Enforce guardrails (Section 11); every feature must start with audio playback |
| **Fretboard touch targets too small on mobile** — frustrating UX on small screens | High | Medium | 44px minimum, test on 375px viewport, allow horizontal scroll |
| **Overbuilding before validating core loop** — building settings/progress before the loop works | Medium | High | Milestone 3 must be playable before any work on Milestones 4–5 |
| **E2E tests flaky due to audio timing** — tests fail inconsistently | Medium | Medium | Mock audio in E2E; never depend on real audio playback in automated tests |
| **Scope creep into theory features** — adding scale diagrams, chord charts, lessons | Medium | High | Refer to non-goals list; any new feature must pass the audio-first litmus test |
| **Browser audio API inconsistencies** — WebAudio behaves differently across browsers | Medium | Medium | Tone.js abstracts most differences; maintain manual QA matrix |
| **Over-testing audio internals** — writing brittle tests against Tone.js API details | Medium | Low | Mock at module boundary; test intent (correct note played), not implementation |

---

## 11. What This Product Will Never Become (MVP)

> **Read this before proposing any new feature. If a feature falls into any of these categories, it is out of scope.**

### ❌ Fretboard Memorization Tool
- No "name the note at this position" quizzes
- No "find note X without audio" challenges
- No flashcard-style fretboard drills
- The fretboard is an INPUT device, not a teaching diagram

### ❌ Theory Learning Platform
- No scale diagrams or scale practice modes
- No chord library or chord encyclopedia
- No circle-of-fifths visualizations
- No key signature lessons
- Theory is only referenced as post-answer context (e.g., "That was a Perfect 5th")

### ❌ Visual-First Training App
- Every challenge MUST start with audio
- No challenge that shows a visual prompt and asks the user to identify it
- If the user's phone is on mute, the app should feel broken — that's correct

### ❌ Note Naming Quiz App
- No text-based answers ("type the note name")
- No multiple-choice "what interval was that?" (user must PLAY, not name)
- Naming is shown as post-answer educational context only

### ❌ General Music Education App
- No video lessons
- No written curriculum
- No ear training for non-guitar instruments
- No sight-reading exercises

### The Litmus Test
For any proposed feature, ask:
1. Does it start with the user hearing audio? **If no → reject.**
2. Does the user respond by playing on the fretboard? **If no → reject.**
3. Does it build the hear→play instinct? **If no → reject.**

---

## 12. Recommended First Action

**Start with Milestone 0: scaffold the project and get CI green.**

Exact first step:

```bash
pnpm create next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"
```

Then:
1. Install Zustand, Tone.js, Vitest, React Testing Library, Playwright
2. Write one passing unit test and one passing Playwright smoke test
3. Push GitHub Actions CI workflow
4. Confirm pipeline goes green

**Why?** Every feature after this is built on a verified foundation. 1–2 hours of setup saves days of debugging later.

---

## Appendix A: Tech Stack Summary

| Concern | Choice |
|---|---|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS v3 |
| State | Zustand (3 stores, 2 persisted) |
| Audio | Tone.js + guitar soundfont samples |
| Package manager | pnpm |
| Unit testing | Vitest + React Testing Library |
| E2E testing | Playwright |
| Accessibility | axe-core/playwright |
| Deployment | Vercel |
| CI | GitHub Actions |

## Appendix B: Tech Debt Log

| ID | Description | Introduced | Priority |
|---|---|---|---|
| _(empty)_ | — | — | — |

---

*End of GuitIQ MVP Build Plan v0.2 — Audio-First Edition*
