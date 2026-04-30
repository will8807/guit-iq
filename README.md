# GuitIQ

GuitIQ is a mobile-first web app that trains one skill: **hearing something and immediately finding it on the guitar**. Sessions are 3–5 minutes — short enough for a coffee break, effective enough to build real ear-to-fretboard instinct.

---

## Audio-First Philosophy

Most guitar training apps start with your eyes. GuitIQ does the opposite.

**Every single challenge begins with audio.** You hear a note, an interval, or a melodic fragment — and then you respond by playing it on an interactive fretboard. There are no visual prompts, no "name the note at fret 7," no scale diagrams, no theory lessons. The only question GuitIQ ever asks is: *did you hear it, and can you play it?*

This approach trains the skill that actually matters in real playing: translating what your ear hears into where your fingers go, without stopping to think about theory. It's the difference between knowing music and hearing music.

If a feature doesn't require the user to hear something first and respond by playing, it doesn't belong in GuitIQ.

---

## Gameplay

Every challenge follows the same loop:

```
HEAR → LOCATE → PLAY → FEEDBACK → ADAPT
```

### 1. Hear
The system plays a sound — a single guitar note, an interval (two notes), or a short melodic phrase — through your device's speaker using real guitar samples. A **Replay** button lets you hear the sound again (up to 3 times per challenge) before you answer.

### 2. Locate
You listen, internalize what you heard, and figure out where it lives on the neck. No timer pressure — take the moment you need.

### 3. Play
Tap the position on the interactive fretboard where you believe the sound is. The fretboard plays back the note you tapped so you immediately hear your own answer.

- **Find the Note:** tap one fret position matching the pitch you heard
- **Find the Interval:** tap the root, then the second note (any valid position on the neck is accepted)

### 4. Feedback
The game evaluates your answer instantly:

- **Correct** — your tapped position glows green, a confirmation sound plays, and your score increments
- **Incorrect** — your tapped position glows red, one correct position is revealed in blue, and the correct sound replays automatically so you hear what you missed

Because guitar has the same pitch at multiple positions, **all enharmonically equivalent fret positions are accepted** as correct.

### 5. Adapt
After each challenge, the difficulty adjusts based on your rolling accuracy over the last 20 challenges. The difficulty axes are:

- Note range (open position → full neck)
- Challenge type (single notes → intervals)
- Number of replays allowed
- Inclusion of accidentals
- Interval size range

### Show Root Mode
An optional **Show Root** setting provides a visual anchor for users practicing without a guitar in hand. When enabled, the root note's string position is highlighted on the fretboard after the audio plays. When disabled, there are zero visual hints — pure ear training.

### Sessions
A session is 5–10 challenges. After the final challenge the session summary screen shows your score, accuracy, and streak. Progress is saved locally so you can see improvement over time.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | [Next.js 16](https://nextjs.org) (App Router) |
| UI | [React 19](https://react.dev) + [Tailwind CSS 4](https://tailwindcss.com) |
| Audio | [Tone.js](https://tonejs.github.io) with guitar sampler |
| State | [Zustand](https://zustand-demo.pmnd.rs) |
| Language | TypeScript |
| Testing | [Vitest](https://vitest.dev) + [Testing Library](https://testing-library.com) + [Playwright](https://playwright.dev) |

---

## Development

**Prerequisites:** Node.js 20+, [pnpm](https://pnpm.io)

```bash
# Install dependencies
pnpm install

# Start the development server
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Other commands

```bash
pnpm lint          # Run ESLint
pnpm typecheck     # Run TypeScript type checking
pnpm test          # Run unit tests (Vitest, watch mode)
pnpm test:ci       # Run unit tests once (CI)
pnpm e2e           # Run end-to-end tests (Playwright)
pnpm build         # Production build
```
