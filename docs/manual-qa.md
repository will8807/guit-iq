# Manual QA Checklist — Audio Engine

Run this checklist on a real device **before merging any PR that touches audio**.
Open `/dev/audio` in a browser.

---

## iOS Safari (iPhone / iPad)

- [ ] Page loads without JS errors in the console
- [ ] Tapping **Init Audio** shows "Audio ready ✓"
- [ ] **C3** plays a clear, audible guitar note
- [ ] **A3** plays a clear, audible guitar note
- [ ] **E4** plays a clear, audible guitar note
- [ ] **C Major Chord** — three notes sound simultaneously
- [ ] **P5 Interval** — C then G play in sequence (~500 ms apart)
- [ ] **✓ Correct** chime plays a pleasant ascending tone
- [ ] **✗ Incorrect** chime plays a descending/dissonant tone
- [ ] No audio plays without first tapping Init Audio (no autoplay violation)
- [ ] Buttons are disabled before Init Audio; enabled after
- [ ] Silent mode / ringer switch **off** — audio still plays (respects iOS silent mode is expected behaviour; note if it does not play)

---

## Android Chrome (Pixel / Samsung)

- [ ] Page loads without JS errors in the console
- [ ] Tapping **Init Audio** shows "Audio ready ✓"
- [ ] **C3** plays a clear, audible guitar note
- [ ] **A3** plays a clear, audible guitar note
- [ ] **E4** plays a clear, audible guitar note
- [ ] **C Major Chord** — three notes sound simultaneously
- [ ] **P5 Interval** — C then G play in sequence (~500 ms apart)
- [ ] **✓ Correct** chime plays
- [ ] **✗ Incorrect** chime plays
- [ ] No audio plays without user gesture
- [ ] Fallback PolySynth: simulate sampler load failure by throttling network (DevTools → Network → Offline) then reloading and tapping Init — a synth sound (not silence) should play

---

## Desktop Chrome (dev baseline)

- [ ] All single note, chord, interval, and chime buttons work
- [ ] Sampler loads within 8 seconds on a normal connection
- [ ] Console shows `[AudioEngine] Sampler ready` (not fallback) on fast connection
- [ ] Console shows `[AudioEngine] Sample loading failed — falling back to PolySynth` when offline

---

## Notes / Observations

_Date:_  
_Tester:_  
_Device(s):_  
_Issues found:_  
